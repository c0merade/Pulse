"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Check,
  CheckCircle2,
  ExternalLink,
  FileText,
  Plus,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import type { DropFlag, ScoreAverages, ThemeCluster } from "@/lib/analytics";
import { DICT, Lang } from "@/lib/i18n";

export interface InboxCohortItem {
  groupId: string;
  groupName: string;
  courseName: string;
  lecturerName: string;
  latestSurvey: {
    id: string;
    title: string;
    waveNumber: number;
    status: string;
    targetResponseRate: number;
    totalInvites: number;
    respondedCount: number;
    responseRate: number;
    averages: ScoreAverages;
    deltas: {
      lectures: number | null;
      practice: number | null;
      materials: number | null;
      organization: number | null;
      overall: number | null;
    };
    drops: DropFlag[];
    analysis: {
      overallSummary: string;
      themes: ThemeCluster[];
      source: string;
    } | null;
    samplePendingToken: string | null;
  } | null;
  issues: Array<{
    id: string;
    title: string;
    category: string;
    status: string;
    ownerName: string;
    dueDate: string;
    isOverdue: boolean;
  }>;
}

export function InboxWorkspaceClient({
  cohorts,
  lang = "hy",
  canManage = true,
  userName = "",
}: {
  cohorts: InboxCohortItem[];
  lang?: Lang;
  canManage?: boolean;
  userName?: string;
}) {
  const router = useRouter();
  const isHy = lang === "hy";
  const t = DICT[lang];

  const [selectedId, setSelectedId] = useState<string>(cohorts[0]?.groupId ?? "");
  const [tab, setTab] = useState<"summary" | "issues" | "turnout">("summary");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const selected = cohorts.find((c) => c.groupId === selectedId) ?? cohorts[0] ?? null;
  const survey = selected?.latestSurvey ?? null;

  // Quick academy-wide stats for the Hero banner
  const scoresWithData = cohorts
    .map((c) => c.latestSurvey?.averages.overall ?? 0)
    .filter((v) => v > 0);
  const academyAvg =
    scoresWithData.length > 0
      ? scoresWithData.reduce((a, b) => a + b, 0) / scoresWithData.length
      : 0;
  const avgTurnout =
    cohorts.length > 0
      ? Math.round(
          cohorts.reduce((a, c) => a + (c.latestSurvey?.responseRate ?? 0), 0) /
            cohorts.length
        )
      : 0;
  const totalOpenIssues = cohorts.reduce(
    (sum, c) =>
      sum +
      c.issues.filter((i) => i.status === "OPEN" || i.status === "IN_PROGRESS")
        .length,
    0
  );

  const firstName = userName ? userName.split(" ")[0] : "";

  async function handleRemind(surveyId: string) {
    setBusy("remind");
    setToast(null);
    try {
      const res = await fetch("/api/reminders/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surveyId, force: true }),
      });
      const data = await res.json();
      if (res.ok && data.summary) {
        const d = data.summary.details[0];
        setToast(
          d?.skippedReason
            ? d.skippedReason
            : isHy
              ? `Ուղարկվեց ${data.summary.remindersSent} հիշեցում։`
              : `Sent ${data.summary.remindersSent} reminder(s).`
        );
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  async function handleAnalyze(surveyId: string) {
    setBusy("analyze");
    setToast(null);
    try {
      const res = await fetch(`/api/surveys/${surveyId}/analyze`, {
        method: "POST",
      });
      if (res.ok) {
        setToast(isHy ? "Ամփոփումը թարմացվեց։" : "Summary updated.");
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  async function handleAddIssue(cohort: InboxCohortItem, theme: ThemeCluster) {
    if (!cohort.latestSurvey) return;
    setBusy(`issue-${theme.theme}`);
    setToast(null);
    try {
      const dueDate = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: isHy ? `Լուծել՝ ${theme.theme}` : `Fix: ${theme.theme}`,
          description: theme.summary,
          category: theme.category,
          severity: theme.severity,
          ownerRole: theme.category === "ORGANIZATION" ? "ADMIN_LEAD" : "EDU_LEAD",
          dueDate,
          groupId: cohort.groupId,
          sourceSurveyId: cohort.latestSurvey.id,
          themeName: theme.theme,
        }),
      });
      if (res.ok) {
        setToast(isHy ? "Ավելացվեց խնդիրների ցուցակում։" : "Added to issues list.");
        setTab("issues");
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  async function handleAdvanceIssue(issueId: string, nextStatus: string) {
    setBusy(issueId);
    try {
      const res = await fetch(`/api/issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          ...(nextStatus === "VERIFIED" && survey
            ? { verifiedBySurveyId: survey.id }
            : {}),
        }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  const openCount =
    selected?.issues.filter(
      (i) => i.status === "OPEN" || i.status === "IN_PROGRESS"
    ).length ?? 0;

  return (
    <div className="space-y-6">
      {/* Sleek Hero Header Banner */}
      <div className="bento-card p-4 sm:p-6 md:p-7 relative overflow-hidden">
        <div
          className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-20 blur-3xl"
          style={{
            background: "radial-gradient(circle, #d900d8 0%, #00e5cc 70%, transparent 100%)",
          }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#d900d8]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Picsart Academy · Pulse
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-primary">
              {isHy
                ? firstName
                  ? `Բարի գալուստ, ${firstName}`
                  : "Ակադեմիայի որակի պատկերը"
                : firstName
                  ? `Welcome back, ${firstName}`
                  : "Academy Quality Pulse"}
            </h1>
            <p className="text-xs sm:text-sm text-muted">
              {isHy
                ? "Ընտրեք խումբը՝ միանգամից տեսնելու ամփոփումը, խնդիրներն ու մասնակցությունը։"
                : "Select a cohort to instantly review its AI summary, issues, and turnout."}
            </p>
          </div>

          {/* Mini KPI Pills + Actions */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-4 px-3.5 sm:px-4 py-2.5 rounded-2xl bento-inner text-xs w-full sm:w-auto">
              <div>
                <div className="text-muted font-medium text-[11px] sm:text-xs">
                  {isHy ? "Միջին միավոր" : "Avg Score"}
                </div>
                <div className="text-base font-bold text-primary">
                  {academyAvg > 0 ? academyAvg.toFixed(1) : "—"}
                  <span className="text-[11px] text-muted font-normal">/5</span>
                </div>
              </div>
              <div className="h-7 w-px bg-[var(--border)]" />
              <div>
                <div className="text-muted font-medium text-[11px] sm:text-xs">
                  {isHy ? "Մասնակցություն" : "Turnout"}
                </div>
                <div className="text-base font-bold text-primary">{avgTurnout}%</div>
              </div>
              <div className="h-7 w-px bg-[var(--border)]" />
              <div>
                <div className="text-muted font-medium text-[11px] sm:text-xs">
                  {isHy ? "Բաց խնդիր" : "Open"}
                </div>
                <div className="text-base font-bold text-primary">
                  {totalOpenIssues}
                </div>
              </div>
            </div>

            {canManage && (
              <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
                <Link
                  href="/reports"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2.5 rounded-full bento-inner hover:border-[#d900d8] text-xs font-semibold text-primary transition-colors whitespace-nowrap"
                >
                  <FileText className="w-3.5 h-3.5 text-muted shrink-0" />
                  <span className="truncate">{isHy ? "Ամփոփագիր" : "Brief"}</span>
                </Link>
                <Link
                  href="/surveys"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2.5 rounded-full bg-[#d900d8] hover:bg-[#b800b7] text-white text-xs font-semibold shadow-sm transition-colors whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{isHy ? "Նոր հարցում" : "New Survey"}</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div className="bento-card px-5 py-3.5 text-sm font-semibold text-primary flex items-center justify-between gap-2 border-[#d900d8]/40">
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="text-muted cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Clean 2-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Tactile Group Cards */}
        <aside className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {isHy ? `Խմբեր (${cohorts.length})` : `Groups (${cohorts.length})`}
            </h2>
          </div>

          <div className="flex lg:flex-col gap-3 overflow-x-auto pb-1 lg:pb-0 snap-x snap-mandatory no-scrollbar -mx-1 px-1">
            {cohorts.map((c) => {
              const isSelected = selected?.groupId === c.groupId;
              const hasAlert =
                (c.latestSurvey?.drops.length ?? 0) > 0 ||
                c.issues.some((i) => i.isOverdue);
              const score = c.latestSurvey?.averages.overall ?? 0;
              const rate = c.latestSurvey?.responseRate ?? 0;
              const targetMet = rate >= (c.latestSurvey?.targetResponseRate ?? 75);

              return (
                <button
                  key={c.groupId}
                  type="button"
                  onClick={() => {
                    setSelectedId(c.groupId);
                    setTab("summary");
                  }}
                  className={`min-w-[250px] sm:min-w-[270px] lg:min-w-0 lg:w-full shrink-0 snap-start text-left p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer space-y-3 ${
                    isSelected
                      ? "bg-[var(--surface)] border-[#d900d8] shadow-[0_8px_28px_rgba(217,0,216,0.12)]"
                      : "bg-[var(--surface)] border-[var(--border)] hover:border-[#d900d8]/40 opacity-90 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-base font-bold text-primary flex items-center gap-2">
                        {c.groupName}
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#d900d8]" />
                        )}
                      </div>
                      <div className="text-xs text-muted mt-0.5 truncate">
                        {c.lecturerName} · {c.courseName}
                      </div>
                    </div>

                    <div
                      className={`px-3 py-1 rounded-2xl text-sm font-bold shrink-0 ${
                        score >= 4.2
                          ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/12 text-amber-700 dark:text-amber-400"
                      }`}
                    >
                      {score > 0 ? score.toFixed(1) : "—"}
                    </div>
                  </div>

                  {/* Mini Turnout Bar + Status */}
                  <div className="space-y-1.5">
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          targetMet ? "bg-emerald-500" : "bg-[#d900d8]"
                        }`}
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      {hasAlert ? (
                        <span className="inline-flex items-center gap-1 text-rose-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          {isHy ? "Ուշադրության կարիք ունի" : "Needs attention"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {isHy ? "Ամեն ինչ լավ է" : "All good"}
                        </span>
                      )}
                      <span className="text-muted">{rate}%</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* RIGHT: Focused Cohort Workspace Card */}
        <section className="lg:col-span-8">
          {!selected || !survey ? (
            <div className="bento-card p-12 text-center text-sm text-muted">
              {isHy ? "Ընտրեք խումբ ձախից։" : "Pick a group on the left."}
            </div>
          ) : (
            <div className="bento-card overflow-hidden">
              {/* Header */}
              <div className="p-4 sm:p-6 md:p-7 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-bold text-primary">
                      {selected.groupName}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bento-inner text-muted">
                      {survey.title}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted mt-1">
                    {selected.courseName} · {selected.lecturerName}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {canManage && survey.responseRate < survey.targetResponseRate ? (
                    <button
                      type="button"
                      onClick={() => handleRemind(survey.id)}
                      disabled={busy !== null}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#d900d8] hover:bg-[#b800b7] text-white text-xs font-semibold cursor-pointer disabled:opacity-60 shadow-sm"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      {busy === "remind"
                        ? isHy
                          ? "Ուղարկվում է..."
                          : "Sending..."
                        : isHy
                          ? "Հիշեցնել ուսանողներին"
                          : "Remind Students"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAnalyze(survey.id)}
                      disabled={busy !== null}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#d900d8] hover:bg-[#b800b7] text-white text-xs font-semibold cursor-pointer disabled:opacity-60 shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {busy === "analyze"
                        ? isHy
                          ? "Թարմացվում է..."
                          : "Updating..."
                        : isHy
                          ? "Թարմացնել AI-ով"
                          : "Update AI Summary"}
                    </button>
                  )}

                  <Link
                    href={`/surveys/${survey.id}`}
                    title={isHy ? "Ամբողջական էջ" : "Full page"}
                    className="p-2.5 rounded-full bento-inner hover:border-[#d900d8] text-muted hover:text-primary transition-colors"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Pill Segmented Tabs */}
              <div className="px-4 sm:px-6 md:px-7 pt-4 sm:pt-5 overflow-x-auto no-scrollbar">
                <div className="inline-flex rounded-2xl bento-inner p-1 gap-1 text-xs font-semibold whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => setTab("summary")}
                    className={`px-3.5 sm:px-4 py-2 rounded-xl transition-all cursor-pointer ${
                      tab === "summary"
                        ? "nav-pill-active shadow-xs"
                        : "text-muted hover:text-primary"
                    }`}
                  >
                    {isHy ? "Ամփոփում" : "Summary"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("issues")}
                    className={`px-3.5 sm:px-4 py-2 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                      tab === "issues"
                        ? "nav-pill-active shadow-xs"
                        : "text-muted hover:text-primary"
                    }`}
                  >
                    {isHy ? "Խնդիրներ" : "Issues"}
                    {openCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                        {openCount}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("turnout")}
                    className={`px-3.5 sm:px-4 py-2 rounded-xl transition-all cursor-pointer ${
                      tab === "turnout"
                        ? "nav-pill-active shadow-xs"
                        : "text-muted hover:text-primary"
                    }`}
                  >
                    {isHy ? "Մասնակցություն" : "Turnout"} ({survey.respondedCount}/
                    {survey.totalInvites})
                  </button>
                </div>
              </div>

              {/* Tab Body */}
              <div className="p-4 sm:p-6 md:p-7">
                {/* TAB 1: SUMMARY */}
                {tab === "summary" && (
                  <div className="space-y-6">
                    {/* Drop Alert */}
                    {survey.drops.length > 0 && (
                      <div className="rounded-2xl bg-rose-500/10 border border-rose-500/25 p-4 flex items-center gap-3 text-sm font-semibold text-rose-700 dark:text-rose-300">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <span>
                          {isHy ? "Գնահատականը իջել է․ " : "Score dropped: "}
                          {survey.drops
                            .map(
                              (d) =>
                                `${d.label} (${d.previousScore.toFixed(1)} → ${d.currentScore.toFixed(1)})`
                            )
                            .join(", ")}
                        </span>
                      </div>
                    )}

                    {/* AI Summary Callout */}
                    <div className="rounded-2xl p-5 bento-inner space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#d900d8]">
                        <Sparkles className="w-3.5 h-3.5" />
                        {isHy ? "Ի՞նչ են ասում ուսանողները" : "What students are saying"}
                      </div>
                      <p className="text-[15px] text-primary leading-relaxed font-medium">
                        {survey.analysis?.overallSummary ||
                          (isHy ? "Դեռ ամփոփում չկա։" : "No summary yet.")}
                      </p>
                    </div>

                    {/* 4 Visual Score Mini-Cards with Progress Bars */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                      {(
                        [
                          { k: "lectures" as const, label: t.categories.LECTURES, color: "bg-[#d900d8]" },
                          { k: "practice" as const, label: t.categories.PRACTICE, color: "bg-[#0071e3]" },
                          { k: "materials" as const, label: t.categories.MATERIALS, color: "bg-emerald-500" },
                          { k: "organization" as const, label: t.categories.ORGANIZATION, color: "bg-amber-500" },
                        ] as const
                      ).map((dim) => {
                        const score = survey.averages[dim.k];
                        const delta = survey.deltas[dim.k];
                        const pct = Math.min(100, Math.round((score / 5) * 100));
                        const isDrop = delta !== null && delta <= -0.4;
                        return (
                          <div
                            key={dim.k}
                            className={`rounded-2xl p-4 bento-inner space-y-2.5 ${
                              isDrop ? "border-rose-500/40" : ""
                            }`}
                          >
                            <div className="text-[11px] font-semibold text-muted truncate">
                              {dim.label}
                            </div>
                            <div className="flex items-baseline justify-between">
                              <span className="text-2xl font-bold text-primary">
                                {score > 0 ? score.toFixed(1) : "—"}
                              </span>
                              {delta !== null && delta !== 0 && (
                                <span
                                  className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${
                                    delta < 0 ? "text-rose-600" : "text-emerald-600"
                                  }`}
                                >
                                  {delta < 0 ? (
                                    <TrendingDown className="w-3 h-3" />
                                  ) : (
                                    <TrendingUp className="w-3 h-3" />
                                  )}
                                  {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
                                </span>
                              )}
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${isDrop ? "bg-rose-500" : dim.color}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Top Themes */}
                    {survey.analysis && survey.analysis.themes.length > 0 && (
                      <div className="space-y-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-muted">
                          {isHy ? "Հիմնական թեմաները" : "Main themes"}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {survey.analysis.themes.slice(0, 4).map((th, idx) => (
                            <div
                              key={idx}
                              className="rounded-2xl p-4 bento-inner flex flex-col justify-between gap-3"
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span
                                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                      th.sentiment === "NEGATIVE"
                                        ? "bg-rose-500/15 text-rose-600"
                                        : th.sentiment === "POSITIVE"
                                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                          : "bg-slate-200 text-muted"
                                    }`}
                                  >
                                    {th.count} {isHy ? "հոգի" : "mentions"}
                                  </span>
                                  <span className="text-[11px] text-muted font-medium">
                                    {t.categories[
                                      th.category as keyof typeof t.categories
                                    ] ?? th.category}
                                  </span>
                                </div>
                                <div className="text-sm font-bold text-primary">
                                  {th.theme}
                                </div>
                                <p className="text-xs text-muted leading-relaxed">
                                  {th.summary}
                                </p>
                              </div>

                              {canManage && th.sentiment === "NEGATIVE" && (
                                <button
                                  type="button"
                                  onClick={() => handleAddIssue(selected, th)}
                                  disabled={busy !== null}
                                  className="self-start px-3 py-1 rounded-full bg-[#d900d8]/10 text-[#b800b7] dark:text-[#f066ef] hover:bg-[#d900d8]/20 text-xs font-bold cursor-pointer transition-colors"
                                >
                                  {isHy ? "+ Խնդիր սարքել" : "+ Track Issue"}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: ISSUES */}
                {tab === "issues" && (
                  <div className="space-y-3">
                    {selected.issues.length === 0 ? (
                      <div className="py-10 text-center text-sm text-muted">
                        {isHy
                          ? "Այս խմբում բաց խնդիրներ չկան։"
                          : "No issues for this group."}
                      </div>
                    ) : (
                      selected.issues.map((issue) => {
                        const isDone =
                          issue.status === "RESOLVED" || issue.status === "VERIFIED";
                        const nextAction =
                          issue.status === "OPEN" || issue.status === "IN_PROGRESS"
                            ? {
                                status: "RESOLVED",
                                label: isHy ? "Նշել լուծված" : "Mark Resolved",
                              }
                            : issue.status === "RESOLVED"
                              ? {
                                  status: "VERIFIED",
                                  label: isHy ? "Հաստատել լուծումը" : "Verify Fix",
                                }
                              : null;

                        return (
                          <div
                            key={issue.id}
                            className="p-4 rounded-2xl bento-inner flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="flex items-start gap-3">
                              <span
                                className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                  issue.status === "VERIFIED"
                                    ? "bg-emerald-500 text-white"
                                    : isDone
                                      ? "bg-sky-500 text-white"
                                      : "border-2 border-slate-400/50"
                                }`}
                              >
                                {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                              </span>
                              <div>
                                <div className="text-sm font-bold text-primary">
                                  {issue.title}
                                </div>
                                <div className="text-xs text-muted mt-0.5">
                                  {issue.ownerName} ·{" "}
                                  <span
                                    className={
                                      issue.isOverdue ? "text-rose-600 font-bold" : ""
                                    }
                                  >
                                    {new Date(issue.dueDate).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {canManage && nextAction ? (
                              <button
                                type="button"
                                disabled={busy === issue.id}
                                onClick={() =>
                                  handleAdvanceIssue(issue.id, nextAction.status)
                                }
                                className="self-start sm:self-center shrink-0 px-4 py-1.5 rounded-full bg-[#d900d8] hover:bg-[#b800b7] text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
                              >
                                {nextAction.label}
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 shrink-0">
                                <CheckCircle2 className="w-4 h-4" />
                                {t.status[issue.status as keyof typeof t.status] ??
                                  issue.status}
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* TAB 3: TURNOUT */}
                {tab === "turnout" && (
                  <div className="space-y-6">
                    <div className="rounded-2xl bento-inner p-6 space-y-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-4xl font-bold text-primary">
                          {survey.responseRate}%
                        </span>
                        <span className="text-sm font-medium text-muted">
                          {survey.respondedCount} / {survey.totalInvites}{" "}
                          {isHy ? "ուսանող պատասխանել է" : "students responded"}
                        </span>
                      </div>
                      <div className="w-full h-3 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            survey.responseRate >= survey.targetResponseRate
                              ? "bg-emerald-500"
                              : "bg-[#d900d8]"
                          }`}
                          style={{ width: `${survey.responseRate}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted">
                        {isHy
                          ? `Թիրախը՝ ${survey.targetResponseRate}%։ Հենց լրանա, հիշեցումներն ավտոմատ կկանգնեն։`
                          : `Target: ${survey.targetResponseRate}%. Reminders stop automatically once reached.`}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleRemind(survey.id)}
                          disabled={busy !== null}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#d900d8] hover:bg-[#b800b7] text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
                        >
                          <Bell className="w-4 h-4" />
                          {isHy
                            ? "Ուղարկել հիշեցում չպատասխանածներին"
                            : "Remind Pending Students"}
                        </button>
                      )}
                      {survey.samplePendingToken && (
                        <Link
                          href={`/s/${survey.samplePendingToken}`}
                          target="_blank"
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bento-inner hover:border-[#d900d8] text-sm font-semibold text-primary"
                        >
                          {isHy ? "Ուսանողի հարցաթերթիկ" : "Student Form"}
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
