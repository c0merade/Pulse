import { NextRequest, NextResponse } from "next/server";
import { LANG_COOKIE_NAME, normalizeLang } from "@/lib/i18n";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const lang = normalizeLang(body?.lang);
    const res = NextResponse.json({ lang });
    res.cookies.set(LANG_COOKIE_NAME, lang, {
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Invalid language" }, { status: 400 });
  }
}
