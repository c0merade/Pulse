import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export function verifyPlatformApiKey(
  request: NextRequest
): { ok: true } | { ok: false; response: NextResponse } {
  const configuredKey = process.env.PLATFORM_API_KEY?.trim();
  if (!configuredKey) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "Platform Sync API is not configured. Set PLATFORM_API_KEY in .env.",
        },
        { status: 503 }
      ),
    };
  }

  const provided = request.headers.get("x-api-key")?.trim() || "";
  const a = Buffer.from(provided);
  const b = Buffer.from(configuredKey);

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid or missing x-api-key header" },
        { status: 401 }
      ),
    };
  }

  return { ok: true };
}
