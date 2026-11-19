import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeAverages, computeDeltas, detectDrops } from "@/lib/analytics";
import { recordAuditLog, requireApiUser } from "@/lib/auth";
import { updateSurveySchema } from "@/lib/validation";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiUser();
    if (auth.error) return auth.error;

    const { id } = await context.params;
    const survey = await prisma.survey.findUnique({
      where: { id },
      include: {
        group: true,
        invites: {
          include: { student: true },
          orderBy: { student: { name: "asc" } },
        },
        responses: {
          orderBy: { submittedAt: "desc" },
        },
        analysis: true,
        reminderLogs: {
          orderBy: { sentAt: "desc" },
          take: 30,
        },
      },
    });

    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    if (
      auth.user.role === "LECTURER" &&
      survey.group.lecturerEmail !== auth.user.email
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const prevSurvey = await prisma.survey.findFirst({
      where: {
        groupId: survey.groupId,
        waveNumber: { lt: survey.waveNumber },
      },
      orderBy: { waveNumber: "desc" },
      include: { responses: true },
    });

    const currentAverages = computeAverages(survey.responses);
    const previousAverages = prevSurvey ? computeAverages(prevSurvey.responses) : null;
    const deltas = computeDeltas(currentAverages, previousAverages);
    const drops = detectDrops(currentAverages, previousAverages);

    const groupIssues = await prisma.issue.findMany({
      where: { groupId: survey.groupId },
      orderBy: { createdAt: "desc" },
    });

    const totalInvites = survey.invites.length;
    const respondedCount = survey.invites.filter((i) => i.respondedAt !== null).length;
    const responseRate =
      totalInvites > 0 ? Math.round((respondedCount / totalInvites) * 100) : 0;

    return NextResponse.json({
      survey: {
        ...survey,
        totalInvites,
        respondedCount,
        responseRate,
        currentAverages,
        previousSurvey: prevSurvey
          ? {
              id: prevSurvey.id,
              title: prevSurvey.title,
              waveNumber: prevSurvey.waveNumber,
              averages: previousAverages,
            }
          : null,
        deltas,
        drops,
        parsedAnalysis: survey.analysis
          ? {
              overallSummary: survey.analysis.overallSummary,
              themes: JSON.parse(survey.analysis.themesJson),
              dropsFlagged: JSON.parse(survey.analysis.dropsFlaggedJson),
              source: survey.analysis.source,
              analyzedAt: survey.analysis.analyzedAt,
            }
          : null,
        groupIssues,
      },
    });
  } catch (error) {
    console.error("GET /api/surveys/[id] error:", error);
    return NextResponse.json({ error: "Failed to load survey" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiUser(["DIRECTOR", "EDU_LEAD", "ADMIN_LEAD"]);
    if (auth.error) return auth.error;

    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateSurveySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid status" },
        { status: 400 }
      );
    }

    const updated = await prisma.survey.update({
      where: { id },
      data: { status: parsed.data.status },
    });

    await recordAuditLog({
      actor: auth.user,
      action: "UPDATE_SURVEY_STATUS",
      entityType: "Survey",
      entityId: updated.id,
      details: `Set status to ${updated.status}`,
    });

    return NextResponse.json({ survey: updated });
  } catch (error) {
    console.error("PATCH /api/surveys/[id] error:", error);
    return NextResponse.json({ error: "Failed to update survey" }, { status: 500 });
  }
}
