import { prisma } from "./prisma";
import { computeAverages, detectDrops } from "./analytics";
import { analyzeSurveyComments } from "./ai-analyzer";
import {
  getAppBaseUrl,
  sendSlackAlert,
  sendStudentReminderEmail,
} from "./notifier";

export interface ReminderRunSummary {
  surveysChecked: number;
  surveysUpdatedStatus: number;
  remindersSent: number;
  surveysAutoAnalyzed: number;
  slackAlertsSent: number;
  details: Array<{
    surveyId: string;
    surveyTitle: string;
    groupName: string;
    responseRate: number;
    targetResponseRate: number;
    sentCount: number;
    skippedReason?: string;
  }>;
}

export async function runSchedulerAndReminders(options?: {
  surveyId?: string;
  force?: boolean;
  autoAnalyze?: boolean;
}): Promise<ReminderRunSummary> {
  const now = new Date();
  let surveysUpdatedStatus = 0;

  // 1. Transition SCHEDULED -> ACTIVE and ACTIVE -> CLOSED based on time
  const toActivate = await prisma.survey.updateMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: now },
      closesAt: { gt: now },
    },
    data: { status: "ACTIVE" },
  });
  surveysUpdatedStatus += toActivate.count;

  const toClose = await prisma.survey.updateMany({
    where: {
      status: { in: ["SCHEDULED", "ACTIVE"] },
      closesAt: { lte: now },
    },
    data: { status: "CLOSED" },
  });
  surveysUpdatedStatus += toClose.count;

  // 2. Fetch active surveys to evaluate reminders
  const activeSurveys = await prisma.survey.findMany({
    where: {
      status: "ACTIVE",
      ...(options?.surveyId ? { id: options.surveyId } : {}),
    },
    include: {
      group: true,
      invites: {
        include: { student: true },
      },
    },
  });

  let remindersSent = 0;
  const details: ReminderRunSummary["details"] = [];

  for (const survey of activeSurveys) {
    const totalInvites = survey.invites.length;
    const respondedCount = survey.invites.filter((i) => i.respondedAt !== null).length;
    const responseRate =
      totalInvites > 0 ? Math.round((respondedCount / totalInvites) * 100) : 0;

    if (responseRate >= survey.targetResponseRate) {
      details.push({
        surveyId: survey.id,
        surveyTitle: survey.title,
        groupName: survey.group.name,
        responseRate,
        targetResponseRate: survey.targetResponseRate,
        sentCount: 0,
        skippedReason: `Target response rate (${survey.targetResponseRate}%) already met`,
      });
      continue;
    }

    const cooldownMs = survey.reminderIntervalHours * 60 * 60 * 1000;
    const eligibleInvites = survey.invites.filter((invite) => {
      if (invite.respondedAt) return false;
      if (options?.force) return true;
      if (!invite.lastRemindedAt) return true;
      return now.getTime() - invite.lastRemindedAt.getTime() >= cooldownMs;
    });

    for (const invite of eligibleInvites) {
      const delivery = await sendStudentReminderEmail({
        toEmail: invite.student.email,
        studentName: invite.student.name,
        groupName: survey.group.name,
        surveyTitle: survey.title,
        token: invite.token,
      });

      const msg = `Hi ${invite.student.name}, please take 60 seconds to complete "${survey.title}" for ${survey.group.name}. Your feedback stays anonymous! Link: /s/${invite.token}`;

      await prisma.$transaction([
        prisma.surveyInvite.update({
          where: { id: invite.id },
          data: {
            remindersSent: { increment: 1 },
            lastRemindedAt: now,
          },
        }),
        prisma.reminderLog.create({
          data: {
            surveyId: survey.id,
            studentName: invite.student.name,
            studentEmail: invite.student.email,
            channel: delivery.channel,
            message: msg,
          },
        }),
      ]);
      remindersSent++;
    }

    details.push({
      surveyId: survey.id,
      surveyTitle: survey.title,
      groupName: survey.group.name,
      responseRate,
      targetResponseRate: survey.targetResponseRate,
      sentCount: eligibleInvites.length,
      skippedReason:
        eligibleInvites.length === 0
          ? "All non-responders are within reminder cooldown window"
          : undefined,
    });
  }

  // 3. Optional Auto-AI Analysis for closed or target-met surveys with fresh responses
  let surveysAutoAnalyzed = 0;
  let slackAlertsSent = 0;

  if (options?.autoAnalyze) {
    const candidates = await prisma.survey.findMany({
      where: {
        status: { in: ["ACTIVE", "CLOSED"] },
        ...(options?.surveyId ? { id: options.surveyId } : {}),
      },
      include: {
        group: true,
        invites: { select: { respondedAt: true } },
        responses: { orderBy: { submittedAt: "desc" } },
        analysis: true,
      },
    });

    for (const s of candidates) {
      if (s.responses.length === 0) continue;

      const totalInvites = s.invites.length;
      const respondedCount = s.invites.filter((i) => i.respondedAt !== null).length;
      const rate = totalInvites > 0 ? Math.round((respondedCount / totalInvites) * 100) : 0;
      const readyForAuto = s.status === "CLOSED" || rate >= s.targetResponseRate;
      if (!readyForAuto) continue;

      const latestResponseAt = s.responses[0]?.submittedAt;
      const needsAnalysis =
        !s.analysis ||
        (latestResponseAt && latestResponseAt > s.analysis.analyzedAt);
      if (!needsAnalysis) continue;

      const prevSurvey = await prisma.survey.findFirst({
        where: { groupId: s.groupId, waveNumber: { lt: s.waveNumber } },
        orderBy: { waveNumber: "desc" },
        include: { responses: true },
      });

      const avg = computeAverages(s.responses);
      const prevAvg = prevSurvey ? computeAverages(prevSurvey.responses) : null;
      const drops = detectDrops(avg, prevAvg);

      const aiResult = await analyzeSurveyComments({
        surveyTitle: s.title,
        groupName: s.group.name,
        courseName: s.group.courseName,
        averages: avg,
        drops,
        responses: s.responses,
      });

      await prisma.surveyAnalysis.upsert({
        where: { surveyId: s.id },
        update: {
          overallSummary: aiResult.overallSummary,
          themesJson: JSON.stringify(aiResult.themes),
          dropsFlaggedJson: JSON.stringify(drops),
          source: aiResult.source,
          analyzedAt: new Date(),
        },
        create: {
          surveyId: s.id,
          overallSummary: aiResult.overallSummary,
          themesJson: JSON.stringify(aiResult.themes),
          dropsFlaggedJson: JSON.stringify(drops),
          source: aiResult.source,
        },
      });
      surveysAutoAnalyzed++;

      if (drops.length > 0) {
        const slackRes = await sendSlackAlert({
          title: `Score Drop Flagged — ${s.group.name} (${s.title})`,
          body: `${drops
            .map(
              (d) =>
                `• ${d.label}: ${d.previousScore.toFixed(1)} → ${d.currentScore.toFixed(1)} (${d.delta.toFixed(2)} pts)`
            )
            .join("\n")}\n\nAI Summary: ${aiResult.overallSummary}`,
          url: `${getAppBaseUrl()}/surveys/${s.id}`,
        });
        if (slackRes.channel === "SLACK_WEBHOOK" && slackRes.delivered) {
          slackAlertsSent++;
        }
      }
    }
  }

  return {
    surveysChecked: activeSurveys.length,
    surveysUpdatedStatus,
    remindersSent,
    surveysAutoAnalyzed,
    slackAlertsSent,
    details,
  };
}
