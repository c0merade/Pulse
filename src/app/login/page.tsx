"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Moon, Sun } from "lucide-react";
import { DICT, Lang, LANG_COOKIE_NAME, normalizeLang } from "@/lib/i18n";
import { PulseLogo } from "@/components/PulseLogo";

export default function LoginPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("hy");
  const [theme, setTheme] = useState<"dark" | "light">("light");
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
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col items-center justify-center p-6 transition-colors">
      {/* Top Minimal Controls */}
      <div className="w-full max-w-md flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <PulseLogo className="w-8 h-8" />
          <span className="font-bold text-base tracking-tight text-primary">
            Pulse <span className="font-normal text-muted">· Picsart Academy</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => switchLang(lang === "hy" ? "en" : "hy")}
            className="px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--surface)] border border-[var(--border)] text-primary cursor-pointer"
          >
            {lang === "hy" ? "ՀԱՅ" : "EN"}
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-full bg-[var(--surface)] border border-[var(--border)] text-primary cursor-pointer"
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Centered Editorial Sign-In Card */}
      <div className="w-full max-w-md bento-card p-8 md:p-9 space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            {t.login.title}
          </h1>
          <p className="text-sm text-muted">{t.login.subtitle}</p>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-4 py-3 text-sm font-medium text-rose-600">
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            doLogin(email, password);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">
              {t.login.email}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl pulse-input px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">
              {t.login.password}
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl pulse-input px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]"
                required
              />
              <Lock className="w-4 h-4 text-muted absolute right-3.5 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold disabled:opacity-60 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? t.login.submitting : t.login.submit}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Role Pills */}
        <div className="pt-5 border-t border-[var(--border)] space-y-3">
          <div className="text-[11px] font-semibold text-muted">
            {t.login.quickTitle}
          </div>
          <div className="grid grid-cols-2 gap-2">
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
                className="text-left p-3 rounded-xl bento-inner hover:border-[var(--accent)] transition-all cursor-pointer"
              >
                <div className="text-xs font-bold text-primary">{acc.label}</div>
                <div className="text-[11px] text-muted truncate mt-0.5">
                  {acc.scope}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
