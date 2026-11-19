import { cookies } from "next/headers";
import { Lang, LANG_COOKIE_NAME, normalizeLang } from "./i18n";

export async function getServerLang(): Promise<Lang> {
  const cookieStore = await cookies();
  return normalizeLang(cookieStore.get(LANG_COOKIE_NAME)?.value);
}

export async function getServerTheme(): Promise<"dark" | "light"> {
  const cookieStore = await cookies();
  return cookieStore.get("pulse_theme")?.value === "light" ? "light" : "dark";
}
