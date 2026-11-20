"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  CheckSquare,
  ClipboardList,
  FileText,
  Globe,
  LayoutGrid,
  LogOut,
  Moon,
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
  const [theme, setTheme] = useState<"dark" | "light">("light");

  useEffect(() => {
    const langCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${LANG_COOKIE_NAME}=`));
    if (langCookie) setLang(normalizeLang(langCookie.split("=")[1]));
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

  const menuItems = [
    { href: "/", label: t.nav.overview, icon: LayoutGrid, leadershipOnly: false },
    { href: "/surveys", label: t.nav.surveys, icon: ClipboardList, leadershipOnly: false },
    { href: "/issues", label: t.nav.issues, icon: CheckSquare, leadershipOnly: false },
    { href: "/compare", label: t.nav.compare, icon: BarChart3, leadershipOnly: true },
  ].filter((item) => !item.leadershipOnly || !isLecturer);

  const academyItems = [
    { href: "/groups", label: t.nav.groups, icon: Users },
    { href: "/reports", label: t.nav.reports, icon: FileText },
    { href: "/audit", label: t.nav.audit, icon: Shield },
  ];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function renderNavItem(item: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }) {
    const active =
      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-[14px] font-medium transition-all ${
          active
            ? "bg-[#111113] text-white dark:bg-white dark:text-[#111113] font-semibold shadow-xs"
            : "text-[#1d1d1f] dark:text-[#e5e5ea] hover:bg-[#f2f2f5] dark:hover:bg-white/[0.06]"
        }`}
      >
        <span className="flex items-center gap-3.5 min-w-0">
          <Icon className="w-[18px] h-[18px] shrink-0 stroke-[1.75]" />
          <span className="truncate">{item.label}</span>
        </span>
      </Link>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--background)] text-[var(--foreground)] transition-colors duration-200">
      {/* Clean Grouped Minimal Sidebar (inspired by reference) */}
      <aside className="w-full md:w-[260px] md:sticky md:top-0 md:h-screen bg-[var(--surface)] border-b md:border-b-0 md:border-r border-[var(--border)] flex flex-col shrink-0 px-4 py-5 overflow-y-auto print:hidden">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 px-2 mb-6">
          <PulseLogo className="w-8 h-8 shrink-0" />
          <div className="leading-tight">
            <div className="font-bold text-base tracking-tight text-primary">
              Pulse
            </div>
            <div className="text-[11px] font-medium text-muted">
              Picsart Academy
            </div>
          </div>
        </Link>

        {/* Section 1: Menu */}
        <div className="space-y-1">
          <div className="px-3 pb-2 text-xs font-medium text-muted">
            {isHy ? "Մենյու" : "Menu"}
          </div>
          <nav className="flex md:flex-col gap-1 overflow-x-auto">
            {menuItems.map(renderNavItem)}
          </nav>
        </div>

        {/* Section 2: Academy (Leadership Only) */}
        {!isLecturer && (
          <div className="hidden md:block mt-7 space-y-1">
            <div className="px-3 pb-2 text-xs font-medium text-muted">
              {isHy ? "Ակադեմիա" : "Academy"}
            </div>
            <div className="space-y-1">{academyItems.map(renderNavItem)}</div>
          </div>
        )}

        {/* Section 3: General (Pinned at bottom) */}
        <div className="hidden md:block mt-auto pt-6 space-y-1">
          <div className="px-3 pb-2 text-xs font-medium text-muted">
            {isHy ? "Ընդհանուր" : "General"}
          </div>

          <button
            type="button"
            onClick={() => switchLang(lang === "hy" ? "en" : "hy")}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-[14px] font-medium text-[#1d1d1f] dark:text-[#e5e5ea] hover:bg-[#f2f2f5] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-3.5">
              <Globe className="w-[18px] h-[18px] stroke-[1.75]" />
              {isHy ? "Լեզու" : "Language"}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#6d5dfc] text-white">
              {lang === "hy" ? "ՀԱՅ" : "EN"}
            </span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-[14px] font-medium text-[#1d1d1f] dark:text-[#e5e5ea] hover:bg-[#f2f2f5] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-3.5">
              {theme === "dark" ? (
                <Sun className="w-[18px] h-[18px] stroke-[1.75]" />
              ) : (
                <Moon className="w-[18px] h-[18px] stroke-[1.75]" />
              )}
              {theme === "dark" ? t.lightMode : t.darkMode}
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                aiMode === "GEMINI" ? "bg-emerald-500" : "bg-amber-400"
              }`}
              title={aiMode === "GEMINI" ? "Gemini AI" : "AI Ready"}
            />
          </button>

          {user && (
            <div className="pt-2 mt-2 border-t border-[var(--border)]">
              <div className="px-4 py-1.5">
                <div className="text-xs font-bold text-primary truncate">
                  {user.name}
                </div>
                <div className="text-[11px] text-muted">
                  {t.roles[user.role as keyof typeof t.roles] ?? user.role}
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-[14px] font-medium text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-[18px] h-[18px] stroke-[1.75]" />
                {t.signOut}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 p-6 md:p-8 lg:p-10">{children}</main>
    </div>
  );
}
