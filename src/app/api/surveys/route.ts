import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { computeAverages, DropFlag } from "@/lib/analytics";
import {
  getGroupScopeWhere,
  recordAuditLog,
  requireApiUser,
} from "@/lib/auth";
import { createSurveySchema } from "@/lib/validation";

export async function GET() {
  try {
    const auth = await requireApiUser();
    if (auth.error) return auth.error;

    const surveys = await prisma.survey.findMany({
      where: {
        group: getGroupScopeWhere(auth.user),
      },
      include: {
        group: true,
        invites: { select: { id: true, respondedAt: true, remindersSent: true } },
        responses: {
          select: {
            lecturesScore: true,
            practiceScore: true,
            materialsScore: true,
            organizationScore: true,
          },
        },
        analysis: {
          select: {
            id: true,
            source: true,
            analyzedAt: true,
            dropsFlaggedJson: true,
          },
        },
      },
      orderBy: [{ scheduledAt: "desc" }],
    });

    const data = surveys.map((s) => {
      const totalInvites = s.invites.length;
      const respondedCount = s.invites.filter((i) => i.respondedAt !== null).length;
      const responseRate =
        totalInvites > 0 ? Math.round((respondedCount / totalInvites) * 100) : 0;
      const averages = computeAverages(s.responses);
      const drops: DropFlag[] = s.analysis?.dropsFlaggedJson
        ? JSON.parse(s.analysis.dropsFlaggedJson)
        : [];

      return {
        id: s.id,
        title: s.title,
        waveNumber: s.waveNumber,
        status: s.status,
        scheduledAt: s.scheduledAt,
        closesAt: s.closesAt,
        targetResponseRate: s.targetResponseRate,
        reminderIntervalHours: s.reminderIntervalHours,
        group: s.group,
        totalInvites,
        respondedCount,
        responseRate,
        targetMet: responseRate >= s.targetResponseRate,
        averages,
        hasAnalysis: Boolean(s.analysis),
        analysisSource: s.analysis?.source ?? null,
        drops,
      };
    });

    return NextResponse.json({ surveys: data });
  } catch (error) {
    console.error("GET /api/surveys error:", error);
    return NextResponse.json({ error: "Failed to load surveys" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiUser(["DIRECTOR", "EDU_LEAD", "ADMIN_LEAD"]);
    if (auth.error) return auth.error;

    const body = await request.json();
    const parsed = createSurveySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid survey payload" },
        { status: 400 }
      );
    }

    const {
      title,
      groupId,
      scheduledAt,
      closesAt,
      targetResponseRate,
      reminderIntervalHours,
      customQuestions,
    } = parsed.data;

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { students: true, surveys: { orderBy: { waveNumber: "desc" }, take: 1 } },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const nextWave = (group.surveys[0]?.waveNumber ?? 0) + 1;
    const start = scheduledAt ? new Date(scheduledAt) : new Date();
    const end = closesAt
      ? new Date(closesAt)
      : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const status = start > now ? "SCHEDULED" : end <= now ? "CLOSED" : "ACTIVE";

    const survey = await prisma.survey.create({
      data: {
        title,
        waveNumber: nextWave,
        groupId: group.id,
        scheduledAt: start,
        closesAt: end,
        targetResponseRate,
        reminderIntervalHours,
        status,
        customQuestionsJson: JSON.stringify(customQuestions ?? []),
        invites: {
          create: group.students.map((st) => ({
            studentId: st.id,
            token: crypto.randomBytes(6).toString("hex"),
          })),
        },
      },
      include: {
        group: true,
        invites: true,
      },
    });

    await recordAuditLog({
      actor: auth.user,
      action: "CREATE_SURVEY",
      entityType: "Survey",
      entityId: survey.id,
      details: `Scheduled "${survey.title}" for ${group.name} (${survey.invites.length} invites)`,
    });

    return NextResponse.json({ survey }, { status: 201 });
  } catch (error) {
    console.error("POST /api/surveys error:", error);
    return NextResponse.json({ error: "Failed to create survey" }, { status: 500 });
  }
}
