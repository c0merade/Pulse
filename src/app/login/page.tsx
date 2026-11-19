"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight, Lock, Moon, ShieldCheck, Sun, Zap } from "lucide-react";
import { DICT, Lang, LANG_COOKIE_NAME, normalizeLang } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("hy");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [email, setEmail] = useState("edu@picsart.academy");
  const [password, setPassword] = useState("pulse123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
  const demoAccounts = [
    { label: t.roles.DIRECTOR, email: "director@picsart.academy", scope: t.login.scopes.director },
    { label: t.roles.EDU_LEAD, email: "edu@picsart.academy", scope: t.login.scopes.edu },
    { label: t.roles.ADMIN_LEAD, email: "admin@picsart.academy", scope: t.login.scopes.admin },
    { label: t.roles.LECTURER, email: "ani.h@picsart.academy", scope: t.login.scopes.lecturer },
  ];

  async function doLogin(loginEmail: string, loginPassword: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid credentials");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f3f6f8] dark:bg-[#0d0f12] flex items-center justify-center p-4 transition-colors">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#16191e] shadow-2xl overflow-hidden">
        {/* Left Bento Brand Panel */}
        <div className="bg-[#111418] text-white p-8 md:p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#00e5cc]/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-[#ffe600]/10 blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#00e5cc] text-slate-950 flex items-center justify-center shadow-[0_0_24px_rgba(0,229,204,0.4)]">
                  <Activity className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <div className="font-extrabold text-xl leading-tight tracking-tight">
                    Pulse
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#ffe600]">
                    Picsart Academy
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-xl bg-white/[0.07] p-0.5 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => switchLang("hy")}
                    className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                      lang === "hy" ? "bg-[#00e5cc] text-slate-950" : "text-slate-300"
                    }`}
                  >
                    ՀԱՅ
                  </button>
                  <button
                    type="button"
                    onClick={() => switchLang("en")}
                    className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                      lang === "en" ? "bg-[#00e5cc] text-slate-950" : "text-slate-300"
                    }`}
                  >
                    ENG
                  </button>
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="p-2 rounded-xl bg-white/[0.07] text-[#ffe600] hover:bg-white/[0.14] cursor-pointer"
                >
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white">
              {t.login.heroTitle}
            </h1>
            <p className="text-sm text-slate-300 mt-4 leading-relaxed font-medium">
              {t.login.heroBody}
            </p>

            {/* Reference-inspired feature pills */}
            <div className="flex flex-wrap gap-2 mt-6">
              {[
                lang === "hy" ? "AI թեմաների ամփոփում" : "AI Theme Summary",
                lang === "hy" ? "Ավտոմատ հիշեցումներ" : "Smart Reminders",
                lang === "hy" ? "Արդար համեմատություն" : "Fair Comparison",
              ].map((pill) => (
                <span
                  key={pill}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs font-bold text-slate-200"
                >
                  <span className="w-4 h-4 rounded-full bg-[#ffe600] text-slate-950 flex items-center justify-center">
                    <Zap className="w-2.5 h-2.5 fill-current" />
                  </span>
                  {pill}
                </span>
              ))}
            </div>
          </div>

          <div className="relative z-10 mt-8 pt-6 border-t border-white/[0.08] space-y-1.5 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-[#00f0d8] font-bold">
              <ShieldCheck className="w-4 h-4" />
              {t.login.rbacTitle}
            </div>
            <p>{t.login.rbacBody}</p>
          </div>
        </div>

        {/* Right Sign-in Panel */}
        <div className="p-8 md:p-10 flex flex-col justify-center">
          <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white tracking-tight">
            {t.login.title}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {t.login.subtitle}
          </p>

          {error && (
            <div className="mt-4 rounded-xl bg-rose-500/10 border border-rose-500/30 px-4 py-3 text-sm font-semibold text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              doLogin(email, password);
            }}
            className="mt-6 space-y-4"
          >
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                {t.login.email}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-white/[0.12] bg-slate-50 dark:bg-[#1e2229] px-4 py-2.5 text-sm font-semibold text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00e5cc]/50 focus:border-[#00e5cc]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                {t.login.password}
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/[0.12] bg-slate-50 dark:bg-[#1e2229] px-4 py-2.5 text-sm font-semibold text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00e5cc]/50 focus:border-[#00e5cc]"
                  required
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#00e5cc] hover:bg-[#00d4bd] text-slate-950 text-sm font-extrabold disabled:opacity-60 transition-all shadow-[0_0_20px_rgba(0,229,204,0.28)] flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? t.login.submitting : t.login.submit}
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>

          {/* Quick Role Switcher */}
          <div className="mt-7 pt-6 border-t border-slate-200 dark:border-white/[0.08]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              {t.login.quickTitle}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword("pulse123");
                    doLogin(acc.email, "pulse123");
                  }}
                  className="text-left p-3 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#1e2229] hover:border-[#00e5cc] hover:bg-[#00e5cc]/10 transition-all cursor-pointer"
                >
                  <div className="text-xs font-extrabold text-slate-950 dark:text-white">
                    {acc.label}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {acc.scope}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
