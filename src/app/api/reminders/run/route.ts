import { NextRequest, NextResponse } from "next/server";
import { runSchedulerAndReminders } from "@/lib/scheduler";
import { recordAuditLog, requireApiUser } from "@/lib/auth";
import { runRemindersSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiUser(["DIRECTOR", "EDU_LEAD", "ADMIN_LEAD"]);
    if (auth.error) return auth.error;

    let payload: unknown = {};
    try {
      payload = await request.json();
    } catch {
      payload = {};
    }

    const parsed = runRemindersSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const summary = await runSchedulerAndReminders(parsed.data);

    await recordAuditLog({
      actor: auth.user,
      action: "RUN_REMINDERS",
      entityType: "Survey",
      entityId: parsed.data.surveyId,
      details: `Checked ${summary.surveysChecked} surveys, sent ${summary.remindersSent} reminder(s)`,
    });

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("POST /api/reminders/run error:", error);
    return NextResponse.json({ error: "Failed to run reminders" }, { status: 500 });
  }
}
