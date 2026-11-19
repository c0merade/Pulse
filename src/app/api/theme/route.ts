import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const theme = body?.theme === "light" ? "light" : "dark";
    const res = NextResponse.json({ theme });
    res.cookies.set("pulse_theme", theme, {
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
  }
}
