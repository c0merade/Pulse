"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight, Lock, ShieldCheck } from "lucide-react";

const DEMO_ACCOUNTS = [
  {
    label: "Director",
    name: "Tigran Hovsepyan",
    email: "director@picsart.academy",
    scope: "Full Academy access",
  },
  {
    label: "Edu Lead",
    name: "Armine Petrosyan",
    email: "edu@picsart.academy",
    scope: "Surveys, AI themes, Issues",
  },
  {
    label: "Admin Lead",
    name: "Hayk Vardanyan",
    email: "admin@picsart.academy",
    scope: "Logistics, Reminders, Groups",
  },
  {
    label: "Lecturer",
    name: "Ani Hakobyan",
    email: "ani.h@picsart.academy",
    scope: "Own group only (Frontend-24)",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("edu@picsart.academy");
  const [password, setPassword] = useState("pulse123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    doLogin(email, password);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Left Brand Panel */}
        <div className="bg-slate-900 text-white p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-sm">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-lg leading-tight tracking-tight">
                  Pulse
                </div>
                <div className="text-xs text-slate-400">
                  Picsart Academy Quality OS
                </div>
              </div>
            </div>
            <h1 className="text-2xl font-bold leading-snug">
              Quality surveys that turn complaints into verified fixes.
            </h1>
            <p className="text-sm text-slate-300 mt-3 leading-relaxed">
              Role-based workspace for the Director, Edu Lead, Admin Lead, and Lecturers. Student survey links remain anonymous and passwordless.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800 space-y-2 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-slate-200 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Role-Based Access Control (RBAC)
            </div>
            <p>
              Lecturers automatically see only their assigned cohorts. Leadership views academy-wide trends, drop flags, and fair comparisons.
            </p>
          </div>
        </div>

        {/* Right Sign-in Form */}
        <div className="p-8">
          <h2 className="text-xl font-bold text-slate-900">Sign in to Pulse</h2>
          <p className="text-xs text-slate-500 mt-1">
            Use your Picsart Academy credentials or pick a role below to test.
          </p>

          {error && (
            <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-sm text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  required
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {loading ? "Signing in..." : "Sign In"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Role Switcher for Demo / Testing */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
              Quick Sign-In (Demo Password: pulse123)
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword("pulse123");
                    doLogin(acc.email, "pulse123");
                  }}
                  className="text-left p-2.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors cursor-pointer"
                >
                  <div className="text-xs font-semibold text-slate-900">
                    {acc.label}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
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
