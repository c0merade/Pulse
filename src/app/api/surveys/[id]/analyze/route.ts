import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeAverages, detectDrops } from "@/lib/analytics";
import { analyzeSurveyComments } from "@/lib/ai-analyzer";
import { recordAuditLog, requireApiUser } from "@/lib/auth";

export async function POST(
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
        responses: true,
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

    const averages = computeAverages(survey.responses);
    const prevAverages = prevSurvey ? computeAverages(prevSurvey.responses) : null;
    const drops = detectDrops(averages, prevAverages);

    const result = await analyzeSurveyComments({
      surveyTitle: survey.title,
      groupName: survey.group.name,
      courseName: survey.group.courseName,
      averages,
      drops,
      responses: survey.responses,
    });

    const saved = await prisma.surveyAnalysis.upsert({
      where: { surveyId: survey.id },
      update: {
        overallSummary: result.overallSummary,
        themesJson: JSON.stringify(result.themes),
        dropsFlaggedJson: JSON.stringify(drops),
        source: result.source,
        analyzedAt: new Date(),
      },
      create: {
        surveyId: survey.id,
        overallSummary: result.overallSummary,
        themesJson: JSON.stringify(result.themes),
        dropsFlaggedJson: JSON.stringify(drops),
        source: result.source,
      },
    });

    await recordAuditLog({
      actor: auth.user,
      action: "RUN_AI_ANALYSIS",
      entityType: "Survey",
      entityId: survey.id,
      details: `Analyzed ${survey.responses.length} responses via ${saved.source} (${result.themes.length} themes)`,
    });

    return NextResponse.json({
      analysis: {
        overallSummary: saved.overallSummary,
        themes: result.themes,
        dropsFlagged: drops,
        source: saved.source,
        analyzedAt: saved.analyzedAt,
      },
    });
  } catch (error) {
    console.error("POST /api/surveys/[id]/analyze error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
