export interface EmailDeliveryResult {
  channel: "EMAIL_RESEND" | "EMAIL_SIMULATED";
  delivered: boolean;
  error?: string;
}

export interface SlackDeliveryResult {
  channel: "SLACK_WEBHOOK" | "SLACK_SIMULATED";
  delivered: boolean;
  error?: string;
}

export function getAppBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") ||
    "http://localhost:3000"
  );
}

export async function sendStudentReminderEmail(params: {
  toEmail: string;
  studentName: string;
  groupName: string;
  surveyTitle: string;
  token: string;
}): Promise<EmailDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail =
    process.env.EMAIL_FROM?.trim() || "Pulse <pulse@picsart.academy>";
  const surveyUrl = `${getAppBaseUrl()}/s/${params.token}`;

  if (!apiKey) {
    return { channel: "EMAIL_SIMULATED", delivered: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [params.toEmail],
        subject: `[Picsart Academy Pulse] Quick feedback for ${params.groupName}`,
        text: `Hi ${params.studentName},\n\nPlease take 60 seconds to complete "${params.surveyTitle}" for ${params.groupName}.\nYour ratings and comments stay completely anonymous.\n\nComplete survey: ${surveyUrl}\n\nThank you!\nPicsart Academy Quality Team`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:20px;">
            <h2 style="color:#4f46e5;margin:0 0 8px;">Picsart Academy Pulse</h2>
            <p style="color:#334155;font-size:14px;">Hi <strong>${params.studentName}</strong>,</p>
            <p style="color:#334155;font-size:14px;">
              Please take 60 seconds to share your anonymous feedback for
              <strong>${params.groupName}</strong> (${params.surveyTitle}).
            </p>
            <p style="margin:24px 0;">
              <a href="${surveyUrl}" style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
                Complete Anonymous Survey
              </a>
            </p>
            <p style="color:#64748b;font-size:12px;">
              Your name is only used to stop reminders. Your responses are stored anonymously.
            </p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Pulse Notifier] Resend email error:", errText);
      return {
        channel: "EMAIL_SIMULATED",
        delivered: false,
        error: `Resend HTTP ${res.status}`,
      };
    }

    return { channel: "EMAIL_RESEND", delivered: true };
  } catch (err) {
    console.error("[Pulse Notifier] Resend network error:", err);
    return {
      channel: "EMAIL_SIMULATED",
      delivered: false,
      error: "Network error",
    };
  }
}

export async function sendSlackAlert(params: {
  title: string;
  body: string;
  url?: string;
}): Promise<SlackDeliveryResult> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return { channel: "SLACK_SIMULATED", delivered: true };
  }

  try {
    const text = params.url
      ? `*${params.title}*\n${params.body}\n<${params.url}|Open in Pulse>`
      : `*${params.title}*\n${params.body}`;

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      console.error("[Pulse Notifier] Slack webhook error:", res.status);
      return {
        channel: "SLACK_SIMULATED",
        delivered: false,
        error: `Slack HTTP ${res.status}`,
      };
    }

    return { channel: "SLACK_WEBHOOK", delivered: true };
  } catch (err) {
    console.error("[Pulse Notifier] Slack network error:", err);
    return {
      channel: "SLACK_SIMULATED",
      delivered: false,
      error: "Network error",
    };
  }
}
