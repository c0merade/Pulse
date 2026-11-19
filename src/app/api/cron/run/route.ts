import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runSchedulerAndReminders } from "@/lib/scheduler";

function verifyCronSecret(request: NextRequest): boolean {
  const configured = process.env.CRON_SECRET?.trim();
  if (!configured) return false;

  const authHeader = request.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const headerSecret = request.headers.get("x-cron-secret")?.trim() || bearer;

  const a = Buffer.from(headerSecret);
  const b = Buffer.from(configured);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function handleCron(request: NextRequest) {
  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured in .env" },
      { status: 503 }
    );
  }

  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 });
  }

  try {
    const summary = await runSchedulerAndReminders({
      force: false,
      autoAnalyze: true,
    });

    await prisma.auditLog.create({
      data: {
        actorEmail: "cron@picsart.academy",
        actorName: "Automated Scheduler",
        actorRole: "CRON",
        action: "CRON_CYCLE",
        entityType: "System",
        details: `Status updates: ${summary.surveysUpdatedStatus}, reminders: ${summary.remindersSent}, auto-analyzed: ${summary.surveysAutoAnalyzed}, slack alerts: ${summary.slackAlertsSent}`,
      },
    });

    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    console.error("Cron /api/cron/run error:", error);
    return NextResponse.json({ error: "Cron run failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}
