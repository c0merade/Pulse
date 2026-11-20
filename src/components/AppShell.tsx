"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileText,
  LogOut,
  Moon,
  Scale,
  Settings2,
  Shield,
  Sun,
  Users,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { DICT, Lang, LANG_COOKIE_NAME, normalizeLang } from "@/lib/i18n";
import { PulseLogo } from "./PulseLogo";

export function AppShell({
  children,
  aiMode = "FALLBACK",
  user,
  initialLang = "hy",
}: {
  children: React.ReactNode;
  aiMode?: "GEMINI" | "FALLBACK";
  user?: SessionUser;
  initialLang?: Lang;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [lang, setLang] = useState<Lang>(initialLang);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const isSecondaryActive =
    pathname.startsWith("/groups") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/audit");
  const [moreOpen, setMoreOpen] = useState(isSecondaryActive);

  useEffect(() => {
    const langCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${LANG_COOKIE_NAME}=`));
    if (langCookie) {
      setLang(normalizeLang(langCookie.split("=")[1]));
    }
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  async function switchLang(next: Lang) {
    setLang(next);
    await fetch("/api/lang", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang: next }),
    });
    router.refresh();
  }

  async function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    await fetch("/api/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: next }),
    });
  }

  const t = DICT[lang];
  const isHy = lang === "hy";
  const isLecturer = user?.role === "LECTURER";

  // 4 Simple Core Pages
  const primaryNav = [
    { href: "/", label: t.nav.overview, icon: BarChart3, leadershipOnly: false },
    { href: "/surveys", label: t.nav.surveys, icon: ClipboardList, leadershipOnly: false },
    { href: "/issues", label: t.nav.issues, icon: CheckSquare, leadershipOnly: false },
    { href: "/compare", label: t.nav.compare, icon: Scale, leadershipOnly: true },
  ].filter((item) => !item.leadershipOnly || !isLecturer);

  // Secondary Admin Pages tucked neatly under "Կառավարում"
  const secondaryNav = [
    { href: "/groups", label: t.nav.groups, icon: Users },
    { href: "/reports", label: t.nav.reports, icon: FileText },
    { href: "/audit", label: t.nav.audit, icon: Shield },
  ];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--background)] text-[var(--foreground)] transition-colors duration-200">
      {/* Clean Minimal Sidebar */}
      <aside className="w-full md:w-64 md:sticky md:top-0 md:h-screen bg-[var(--surface)] border-b md:border-b-0 md:border-r border-[var(--border)] flex flex-col shrink-0 print:hidden">
        {/* Brand + Theme */}
        <div className="px-5 py-5 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-3">
            <PulseLogo className="w-9 h-9 shrink-0 drop-shadow-[0_0_12px_rgba(85,255,240,0.28)]" />
            <div>
              <div className="font-extrabold text-lg leading-tight tracking-tight text-primary">
                Pulse
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-yellow-accent">
                {t.brandSub}
              </div>
            </div>
          </Link>

          <button
            type="button"
            onClick={toggleTheme}
            title={theme === "dark" ? t.lightMode : t.darkMode}
            className="p-2 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-yellow-accent hover:border-[#ffe600] transition-colors cursor-pointer"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Primary 4-Item Navigation */}
        <nav className="px-3.5 py-2 flex md:flex-col gap-1.5 overflow-x-auto">
          {primaryNav.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                  active
                    ? "bg-[#00e5cc]/15 text-cyan-accent border border-[#00e5cc]/40"
                    : "text-muted hover:bg-[var(--surface-elevated)] hover:text-primary border border-transparent"
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    active ? "text-cyan-accent" : "opacity-70"
                  }`}
                />
                {item.label}
              </Link>
            );
          })}

          {/* Collapsible Management Group (Leadership Only) */}
          {!isLecturer && (
            <div className="hidden md:block pt-3 mt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted hover:text-primary cursor-pointer"
              >
                <span className="inline-flex items-center gap-2">
                  <Settings2 className="w-3.5 h-3.5" />
                  {isHy ? "Կառավարում" : "Manage"}
                </span>
                {moreOpen ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {moreOpen && (
                <div className="mt-1 space-y-1">
                  {secondaryNav.map((item) => {
                    const active = pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          active
                            ? "bg-[#00e5cc]/15 text-cyan-accent border border-[#00e5cc]/40"
                            : "text-muted hover:bg-[var(--surface-elevated)] hover:text-primary border border-transparent"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Sticky Bottom: Compact Language + AI dot + User */}
        <div className="mt-auto hidden md:block p-4 space-y-3 border-t border-[var(--border)]">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted">
              <span
                className={`w-2 h-2 rounded-full ${
                  aiMode === "GEMINI" ? "bg-[#00f0d8]" : "bg-[#ffe600]"
                }`}
              />
              {aiMode === "GEMINI" ? "Gemini AI" : "AI Ready"}
            </div>

            <div className="inline-flex rounded-lg bg-[var(--surface-elevated)] p-0.5 text-[11px] font-extrabold border border-[var(--border)]">
              <button
                type="button"
                onClick={() => switchLang("hy")}
                className={`px-2 py-0.5 rounded-md cursor-pointer ${
                  lang === "hy" ? "bg-[#e000df] text-white" : "text-muted"
                }`}
              >
                ՀԱՅ
              </button>
              <button
                type="button"
                onClick={() => switchLang("en")}
                className={`px-2 py-0.5 rounded-md cursor-pointer ${
                  lang === "en" ? "bg-[#e000df] text-white" : "text-muted"
                }`}
              >
                EN
              </button>
            </div>
          </div>

          {user && (
            <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[var(--border)]">
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-primary truncate">
                  {user.name}
                </div>
                <div className="text-xs font-bold text-yellow-accent">
                  {t.roles[user.role as keyof typeof t.roles] ?? user.role}
                </div>
              </div>
              <button
                onClick={handleLogout}
                title={t.signOut}
                className="p-2 rounded-xl text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Spacious Main Content */}
      <main className="flex-1 min-w-0 p-5 md:p-10 max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
