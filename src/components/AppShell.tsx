"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  CheckSquare,
  ClipboardList,
  FileText,
  Globe,
  LogOut,
  Scale,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { DICT, Lang, LANG_COOKIE_NAME, normalizeLang } from "@/lib/i18n";

export function AppShell({
  children,
  aiMode = "FALLBACK",
  user,
}: {
  children: React.ReactNode;
  aiMode?: "GEMINI" | "FALLBACK";
  user?: SessionUser;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${LANG_COOKIE_NAME}=`));
    if (match) {
      setLang(normalizeLang(match.split("=")[1]));
    }
  }, []);

  async function toggleLang(next: Lang) {
    setLang(next);
    await fetch("/api/lang", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang: next }),
    });
    router.refresh();
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
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col shrink-0 print:hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-900 leading-tight tracking-tight">
                Pulse
              </div>
              <div className="text-[11px] font-medium text-indigo-600">
                {t.brandSub}
              </div>
            </div>
          </div>

          {/* EN / HY Toggle */}
          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => toggleLang("en")}
              className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                lang === "en"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => toggleLang("hy")}
              className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                lang === "hy"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              ՀԱՅ
            </button>
          </div>
        </div>

        <nav className="p-3 flex md:flex-col gap-1 overflow-x-auto">
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
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto hidden md:block p-4 space-y-3 border-t border-slate-100">
          <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-3 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              {t.aiStatus}
            </div>
            {aiMode === "GEMINI" ? (
              <p className="text-emerald-700">{t.aiConnected}</p>
            ) : (
              <p className="text-slate-600 leading-relaxed">{t.aiFallback}</p>
            )}
          </div>

          {user && (
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900 truncate">
                  {user.name}
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-slate-400" />
                  {t.roles[user.role as keyof typeof t.roles] ?? user.role}
                </div>
              </div>
              <button
                onClick={handleLogout}
                title={t.signOut}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
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
