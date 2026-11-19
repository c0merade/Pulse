"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  CheckSquare,
  ClipboardList,
  FileText,
  LogOut,
  Moon,
  Scale,
  Shield,
  Sparkles,
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
  const isLecturer = user?.role === "LECTURER";

  const navItems = [
    { href: "/", label: t.nav.overview, icon: BarChart3, leadershipOnly: false },
    { href: "/surveys", label: t.nav.surveys, icon: ClipboardList, leadershipOnly: false },
    { href: "/issues", label: t.nav.issues, icon: CheckSquare, leadershipOnly: false },
    { href: "/compare", label: t.nav.compare, icon: Scale, leadershipOnly: true },
    { href: "/groups", label: t.nav.groups, icon: Users, leadershipOnly: true },
    { href: "/reports", label: t.nav.reports, icon: FileText, leadershipOnly: true },
    { href: "/audit", label: t.nav.audit, icon: Shield, leadershipOnly: true },
  ].filter((item) => !item.leadershipOnly || !isLecturer);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--background)] text-[var(--foreground)] transition-colors duration-200">
      {/* Bento Sidebar */}
      <aside className="w-full md:w-68 bg-[var(--surface)] border-b md:border-b-0 md:border-r border-[var(--border)] flex flex-col shrink-0 print:hidden">
        {/* Brand Header */}
        <div className="px-5 py-5 border-b border-[var(--border)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <PulseLogo className="w-10 h-10 shrink-0 drop-shadow-[0_0_12px_rgba(85,255,240,0.28)]" />
            <div>
              <div className="font-extrabold text-lg leading-tight tracking-tight text-primary">
                Pulse
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-yellow-accent">
                {t.brandSub}
              </div>
            </div>
          </div>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === "dark" ? t.lightMode : t.darkMode}
            className="p-2 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-yellow-accent hover:border-[#ffe600] transition-colors cursor-pointer"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Language Toggle Pill */}
        <div className="px-4 pt-4">
          <div className="grid grid-cols-2 rounded-xl bg-[var(--surface-elevated)] p-1 text-xs font-extrabold border border-[var(--border)]">
            <button
              type="button"
              onClick={() => switchLang("hy")}
              className={`py-1.5 rounded-lg cursor-pointer transition-all ${
                lang === "hy"
                  ? "bg-[#00e5cc] text-slate-950 shadow-xs"
                  : "text-muted hover:text-primary"
              }`}
            >
              ՀԱՅ
            </button>
            <button
              type="button"
              onClick={() => switchLang("en")}
              className={`py-1.5 rounded-lg cursor-pointer transition-all ${
                lang === "en"
                  ? "bg-[#00e5cc] text-slate-950 shadow-xs"
                  : "text-muted hover:text-primary"
              }`}
            >
              ENG
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3.5 flex md:flex-col gap-1.5 overflow-x-auto">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                  active
                    ? "bg-[#00e5cc]/15 text-cyan-accent border border-[#00e5cc]/40 shadow-[0_0_16px_rgba(0,229,204,0.12)]"
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
        </nav>

        {/* Bottom Status & User */}
        <div className="mt-auto hidden md:block p-4 space-y-3 border-t border-[var(--border)]">
          <div className="bento-inner p-3.5 text-xs">
            <div className="flex items-center gap-2 font-bold text-primary mb-1">
              <span className="w-5 h-5 rounded-full bg-[#ffe600] text-slate-950 flex items-center justify-center">
                <Sparkles className="w-3 h-3" />
              </span>
              {t.aiStatus}
            </div>
            <p
              className={`font-semibold ${
                aiMode === "GEMINI" ? "text-cyan-accent" : "text-muted"
              }`}
            >
              {aiMode === "GEMINI" ? t.aiConnected : t.aiFallback}
            </p>
          </div>

          {user && (
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border)]">
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

      {/* Main Content */}
      <main className="flex-1 min-w-0 p-5 md:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
