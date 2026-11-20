"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  FileText,
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const langCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${LANG_COOKIE_NAME}=`));
    if (langCookie) setLang(normalizeLang(langCookie.split("=")[1]));
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  const primaryNav = [
    { href: "/", label: t.nav.overview, leadershipOnly: false },
    { href: "/surveys", label: t.nav.surveys, leadershipOnly: false },
    { href: "/issues", label: t.nav.issues, leadershipOnly: false },
    { href: "/compare", label: t.nav.compare, leadershipOnly: true },
  ].filter((item) => !item.leadershipOnly || !isLecturer);

  const secondaryNav = [
    { href: "/groups", label: t.nav.groups, icon: Users },
    { href: "/reports", label: t.nav.reports, icon: FileText },
    { href: "/audit", label: t.nav.audit, icon: Shield },
  ];

  const isSecondaryActive = secondaryNav.some((item) =>
    pathname.startsWith(item.href)
  );

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "P";

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)] transition-colors duration-200">
      {/* Apple-style Translucent Sticky Top Bar */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/85 backdrop-blur-xl print:hidden">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <PulseLogo className="w-8 h-8" />
            <div className="leading-none">
              <span className="font-bold text-base tracking-tight text-primary">
                Pulse
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium text-muted">
                Picsart Academy
              </span>
            </div>
          </Link>

          {/* Center Pill Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {primaryNav.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-all ${
                    active
                      ? "bg-[#1d1d1f] text-white dark:bg-white dark:text-black"
                      : "text-muted hover:text-primary hover:bg-[var(--surface-elevated)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* Leadership Dropdown */}
            {!isLecturer && (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-all cursor-pointer ${
                    isSecondaryActive
                      ? "bg-[#1d1d1f] text-white dark:bg-white dark:text-black"
                      : "text-muted hover:text-primary hover:bg-[var(--surface-elevated)]"
                  }`}
                >
                  {isHy ? "Կառավարում" : "Manage"}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bento-card p-1.5 shadow-xl z-50">
                    {secondaryNav.map((item) => {
                      const Icon = item.icon;
                      const active = pathname.startsWith(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                            active
                              ? "bg-[var(--accent-soft)] text-[var(--accent-text)]"
                              : "text-primary hover:bg-[var(--surface-elevated)]"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => switchLang(lang === "hy" ? "en" : "hy")}
              className="px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--surface-elevated)] border border-[var(--border)] text-primary hover:border-[var(--accent)] transition-colors cursor-pointer"
              title="Switch language"
            >
              {lang === "hy" ? "ՀԱՅ" : "EN"}
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              title={theme === "dark" ? t.lightMode : t.darkMode}
              className="p-2 rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] text-primary hover:border-[var(--accent)] transition-colors cursor-pointer"
            >
              {theme === "dark" ? (
                <Sun className="w-3.5 h-3.5" />
              ) : (
                <Moon className="w-3.5 h-3.5" />
              )}
            </button>

            {user && (
              <div className="flex items-center gap-2 pl-2 ml-1 border-l border-[var(--border)]">
                <div
                  title={`${user.name} · ${
                    t.roles[user.role as keyof typeof t.roles] ?? user.role
                  } (${aiMode === "GEMINI" ? "Gemini AI" : "AI Ready"})`}
                  className="w-8 h-8 rounded-full bg-[var(--accent)] text-white text-xs font-bold flex items-center justify-center"
                >
                  {initials}
                </div>
                <button
                  onClick={handleLogout}
                  title={t.signOut}
                  className="p-1.5 rounded-full text-muted hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Secondary Nav */}
        <div className="md:hidden border-t border-[var(--border)] px-4 py-2 flex items-center gap-1.5 overflow-x-auto">
          {primaryNav.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                  active
                    ? "bg-[#1d1d1f] text-white dark:bg-white dark:text-black"
                    : "text-muted"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </header>

      {/* Editorial Centered Canvas */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-5 md:px-8 py-8 md:py-12">
        {children}
      </main>
    </div>
  );
}
