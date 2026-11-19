import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { submitResponseSchema } from "@/lib/validation";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const invite = await prisma.surveyInvite.findUnique({
      where: { token },
      include: {
        student: { select: { name: true } },
        survey: {
          include: {
            group: { select: { name: true, courseName: true, lecturerName: true } },
          },
        },
      },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invalid survey link" }, { status: 404 });
    }

    return NextResponse.json({
      studentName: invite.student.name,
      alreadyResponded: invite.respondedAt !== null,
      respondedAt: invite.respondedAt,
      survey: {
        id: invite.survey.id,
        title: invite.survey.title,
        status: invite.survey.status,
        closesAt: invite.survey.closesAt,
        group: invite.survey.group,
      },
    });
  } catch (error) {
    console.error("GET /api/respond/[token] error:", error);
    return NextResponse.json({ error: "Failed to load survey" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const rl = checkRateLimit({
      key: `respond:${ip}`,
      limit: 30,
      windowMs: 60 * 1000,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Please try again in ${rl.retryAfterSeconds}s.` },
        { status: 429 }
      );
    }

    const { token } = await context.params;
    const body = await request.json();
    const parsed = submitResponseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid survey response" },
        { status: 400 }
      );
    }

    const {
      lecturesScore,
      practiceScore,
      materialsScore,
      organizationScore,
      comment,
      customAnswers,
    } = parsed.data;

    const invite = await prisma.surveyInvite.findUnique({
      where: { token },
      include: { survey: true },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invalid survey link" }, { status: 404 });
    }

    if (invite.respondedAt) {
      return NextResponse.json(
        { error: "You have already submitted a response for this survey" },
        { status: 409 }
      );
    }

    if (invite.survey.status === "CLOSED") {
      return NextResponse.json(
        { error: "This survey is already closed" },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.response.create({
        data: {
          surveyId: invite.surveyId,
          lecturesScore,
          practiceScore,
          materialsScore,
          organizationScore,
          comment: comment.trim(),
          customAnswersJson: JSON.stringify(customAnswers ?? {}),
        },
      }),
      prisma.surveyInvite.update({
        where: { id: invite.id },
        data: { respondedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("POST /api/respond/[token] error:", error);
    return NextResponse.json({ error: "Failed to submit response" }, { status: 500 });
  }
}
