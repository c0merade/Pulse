import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - startedAt;

    return NextResponse.json({
      status: "ok",
      service: "pulse-picsart-academy",
      db: { connected: true, latencyMs: dbLatencyMs },
      integrations: {
        ai: process.env.GEMINI_API_KEY?.trim() ? "GEMINI" : "FALLBACK",
        email: process.env.RESEND_API_KEY?.trim() ? "RESEND" : "SIMULATED",
        slack: process.env.SLACK_WEBHOOK_URL?.trim() ? "WEBHOOK" : "SIMULATED",
        platformSync: Boolean(process.env.PLATFORM_API_KEY?.trim()),
        cron: Boolean(process.env.CRON_SECRET?.trim()),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("GET /api/health error:", error);
    return NextResponse.json(
      { status: "degraded", db: { connected: false } },
      { status: 503 }
    );
  }
}
