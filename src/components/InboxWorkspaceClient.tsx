"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ExternalLink,
  Plus,
  PlusCircle,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
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
}: {
  cohorts: InboxCohortItem[];
  lang?: Lang;
  canManage?: boolean;
}) {
  const router = useRouter();
  const isHy = lang === "hy";
  const t = DICT[lang];

  const [selectedId, setSelectedId] = useState<string>(
    cohorts[0]?.groupId ?? ""
  );
  const [filter, setFilter] = useState<"ALL" | "ATTENTION">("ALL");
  const [query, setQuery] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filteredCohorts = cohorts.filter((c) => {
    const needsAttention =
      (c.latestSurvey?.drops.length ?? 0) > 0 ||
      c.issues.some((i) => i.isOverdue);
    if (filter === "ATTENTION" && !needsAttention) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      return (
        c.groupName.toLowerCase().includes(q) ||
        c.lecturerName.toLowerCase().includes(q) ||
        c.courseName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selected =
    filteredCohorts.find((c) => c.groupId === selectedId) ??
    filteredCohorts[0] ??
    cohorts[0] ??
    null;

  async function handleRemindCohort(surveyId: string) {
    setBusyAction("remind");
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
      setBusyAction(null);
    }
  }

  async function handleAnalyzeCohort(surveyId: string) {
    setBusyAction("analyze");
    setToast(null);
    try {
      const res = await fetch(`/api/surveys/${surveyId}/analyze`, {
        method: "POST",
      });
      if (res.ok) {
        setToast(
          isHy ? "AI ամփոփումը թարմացվեց։" : "AI summary updated."
        );
        router.refresh();
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function handleQuickCreateIssue(
    cohort: InboxCohortItem,
    theme: ThemeCluster
  ) {
    if (!cohort.latestSurvey) return;
    setBusyAction(`issue-${theme.theme}`);
    setToast(null);
    try {
      const dueDate = new Date(Date.now() + 14 * 86400000)
        .toISOString()
        .slice(0, 10);
      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: isHy ? `Լուծել՝ ${theme.theme}` : `Address: ${theme.theme}`,
          description: theme.summary,
          category: theme.category,
          severity: theme.severity,
          ownerRole:
            theme.category === "ORGANIZATION" ? "ADMIN_LEAD" : "EDU_LEAD",
          dueDate,
          groupId: cohort.groupId,
          sourceSurveyId: cohort.latestSurvey.id,
          themeName: theme.theme,
        }),
      });
      if (res.ok) {
        setToast(
          isHy
            ? `«${theme.theme}» թեմայից ստեղծվեց նոր խնդիր։`
            : `Created issue from "${theme.theme}".`
        );
        router.refresh();
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function handleIssueStatus(issueId: string, status: string) {
    const res = await fetch(`/api/issues/${issueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        ...(status === "VERIFIED" && selected?.latestSurvey
          ? { verifiedBySurveyId: selected.latestSurvey.id }
          : {}),
      }),
    });
    if (res.ok) {
      router.refresh();
    }
  }

  const survey = selected?.latestSurvey ?? null;

  return (
    <div className="space-y-4">
      {toast && (
        <div className="bento-card px-4 py-3 text-sm font-semibold text-primary flex items-center justify-between gap-2 border-[#d900d8]/40">
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="text-muted cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Split Master-Detail Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT PANE: Cohort Inbox List (4 cols) */}
        <aside className="lg:col-span-4 xl:col-span-3 bento-card overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[var(--border)] space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="text-base font-bold text-primary">
                {isHy ? "Խմբերի մուտքային" : "Quality Inbox"}
              </h1>
              {canManage && (
                <Link
                  href="/surveys"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#d900d8] hover:bg-[#b800b7] text-white text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isHy ? "Նոր" : "New"}
                </Link>
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-2.5" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isHy ? "Որոնել խումբ կամ դասախոս..." : "Search group or lecturer..."}
                className="w-full rounded-xl pulse-input pl-8 pr-3 py-1.5 text-xs font-medium focus:outline-none focus:border-[#d900d8]"
              />
            </div>

            {/* Filter Pills */}
            <div className="grid grid-cols-2 gap-1.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilter("ALL")}
                className={`py-1.5 rounded-lg cursor-pointer transition-colors ${
                  filter === "ALL"
                    ? "bg-[#1d1d1f] text-white dark:bg-white dark:text-black"
                    : "bg-[var(--surface-elevated)] text-muted hover:text-primary"
                }`}
              >
                {isHy ? `Բոլորը (${cohorts.length})` : `All (${cohorts.length})`}
              </button>
              <button
                type="button"
                onClick={() => setFilter("ATTENTION")}
                className={`py-1.5 rounded-lg cursor-pointer transition-colors ${
                  filter === "ATTENTION"
                    ? "bg-rose-600 text-white"
                    : "bg-[var(--surface-elevated)] text-muted hover:text-primary"
                }`}
              >
                {isHy ? "Ուշադրություն" : "Attention"}
              </button>
            </div>
          </div>

          {/* Cohort List Items */}
          <div className="divide-y divide-[var(--border)]">
            {filteredCohorts.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted">
                {isHy ? "Խմբեր չգտնվեցին։" : "No matching cohorts."}
              </div>
            ) : (
              filteredCohorts.map((c) => {
                const isSelected = selected?.groupId === c.groupId;
                const hasDrop = (c.latestSurvey?.drops.length ?? 0) > 0;
                const hasOverdue = c.issues.some((i) => i.isOverdue);
                const rate = c.latestSurvey?.responseRate ?? 0;

                return (
                  <button
                    key={c.groupId}
                    type="button"
                    onClick={() => setSelectedId(c.groupId)}
                    className={`w-full text-left p-4 transition-colors cursor-pointer flex flex-col gap-2 ${
                      isSelected
                        ? "bg-[var(--accent-soft)] border-l-3 border-l-[#d900d8]"
                        : "hover:bg-[var(--surface-elevated)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            hasDrop || hasOverdue
                              ? "bg-rose-500"
                              : "bg-emerald-500"
                          }`}
                        />
                        <span className="font-bold text-sm text-primary truncate">
                          {c.groupName}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-primary shrink-0">
                        {c.latestSurvey?.averages.overall
                          ? `${c.latestSurvey.averages.overall.toFixed(1)}/5`
                          : "—"}
                      </span>
                    </div>

                    <div className="text-xs text-muted truncate">
                      {c.lecturerName} · {c.courseName}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <div className="flex-1 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            rate >= (c.latestSurvey?.targetResponseRate ?? 75)
                              ? "bg-emerald-500"
                              : "bg-[#d900d8]"
                          }`}
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-muted shrink-0">
                        {rate}%
                      </span>
                    </div>

                    {(hasDrop || hasOverdue) && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {hasDrop && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600">
                            {isHy ? "Անկում" : "Score drop"}
                          </span>
                        )}
                        {hasOverdue && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400">
                            {isHy ? "Ուշացած խնդիր" : "Overdue issue"}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* RIGHT PANE: Instant Cohort Detail Workspace (8/9 cols) */}
        <section className="lg:col-span-8 xl:col-span-9 space-y-5 min-w-0">
          {!selected || !survey ? (
            <div className="bento-card p-12 text-center text-sm text-muted">
              {isHy ? "Ընտրեք խումբ ձախ ցուցակից։" : "Select a cohort from the inbox."}
            </div>
          ) : (
            <>
              {/* Cohort Header Card */}
              <div className="bento-card p-6 space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-muted">
                      {selected.courseName} · {selected.lecturerName}
                    </div>
                    <h2 className="text-2xl font-bold text-primary mt-0.5">
                      {selected.groupName}{" "}
                      <span className="text-base font-medium text-muted">
                        — {survey.title}
                      </span>
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {canManage && survey.status === "ACTIVE" && (
                      <button
                        type="button"
                        onClick={() => handleRemindCohort(survey.id)}
                        disabled={busyAction !== null}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] hover:border-[#d900d8] text-xs font-semibold text-primary cursor-pointer disabled:opacity-60"
                      >
                        <Bell className="w-3.5 h-3.5 text-[#d900d8]" />
                        {busyAction === "remind"
                          ? isHy
                            ? "Ուղարկվում է..."
                            : "Sending..."
                          : isHy
                            ? "Հիշեցնել"
                            : "Remind"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleAnalyzeCohort(survey.id)}
                      disabled={busyAction !== null}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#d900d8] hover:bg-[#b800b7] text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {busyAction === "analyze"
                        ? isHy
                          ? "Վերլուծվում է..."
                          : "Analyzing..."
                        : isHy
                          ? "Թարմացնել AI"
                          : "Refresh AI"}
                    </button>
                    <Link
                      href={`/surveys/${survey.id}`}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-full border border-[var(--border)] text-xs font-semibold text-muted hover:text-primary"
                    >
                      {isHy ? "Ամբողջ էջ" : "Full View"}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                {/* 4 Compact Dimension Scores */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(
                    [
                      { k: "lectures" as const, label: t.categories.LECTURES },
                      { k: "practice" as const, label: t.categories.PRACTICE },
                      { k: "materials" as const, label: t.categories.MATERIALS },
                      { k: "organization" as const, label: t.categories.ORGANIZATION },
                    ] as const
                  ).map((dim) => {
                    const val = survey.averages[dim.k];
                    const delta = survey.deltas[dim.k];
                    const isDrop = delta !== null && delta <= -0.4;
                    return (
                      <div
                        key={dim.k}
                        className={`bento-inner p-3.5 ${
                          isDrop ? "border-rose-500/50 bg-rose-500/[0.04]" : ""
                        }`}
                      >
                        <div className="text-[11px] font-semibold text-muted">
                          {dim.label}
                        </div>
                        <div className="mt-1 flex items-baseline justify-between">
                          <span className="text-2xl font-bold text-primary">
                            {val > 0 ? val.toFixed(1) : "—"}
                          </span>
                          {delta !== null && (
                            <span
                              className={`inline-flex items-center gap-0.5 text-xs font-bold ${
                                isDrop
                                  ? "text-rose-600"
                                  : delta > 0
                                    ? "text-emerald-600"
                                    : "text-muted"
                              }`}
                            >
                              {delta < 0 ? (
                                <TrendingDown className="w-3 h-3" />
                              ) : delta > 0 ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : null}
                              {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Drop Alert Inside Detail */}
                {survey.drops.length > 0 && (
                  <div className="rounded-xl bg-rose-500/10 border border-rose-500/25 px-4 py-3 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      {isHy ? "Անկում նախորդ ալիքի համեմատ․ " : "Drop vs previous wave: "}
                      {survey.drops
                        .map(
                          (d) =>
                            `${d.label} (${d.previousScore.toFixed(1)} → ${d.currentScore.toFixed(1)})`
                        )
                        .join(", ")}
                    </span>
                  </div>
                )}
              </div>

              {/* AI Summary & Themes (Direct in Inbox!) */}
              <div className="bento-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-primary flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#d900d8]" />
                    {isHy ? "AI ամփոփում և թեմաներ" : "AI Summary & Themes"}
                  </h3>
                  <span className="text-xs text-muted font-medium">
                    {survey.respondedCount} / {survey.totalInvites}{" "}
                    {isHy ? "ուսանող" : "students"} ({survey.responseRate}%)
                  </span>
                </div>

                {survey.analysis ? (
                  <>
                    <p className="text-sm text-primary leading-relaxed bento-inner p-4">
                      {survey.analysis.overallSummary}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {survey.analysis.themes.map((th, idx) => (
                        <div
                          key={idx}
                          className="bento-inner p-4 flex flex-col justify-between gap-3"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  th.sentiment === "NEGATIVE"
                                    ? "bg-rose-500/15 text-rose-600"
                                    : th.sentiment === "POSITIVE"
                                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                      : "bg-slate-200 text-muted"
                                }`}
                              >
                                {th.count} {isHy ? "հիշատակում" : "mentions"}
                              </span>
                              <span className="text-[10px] font-semibold text-muted">
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

                          {canManage && (
                            <button
                              type="button"
                              disabled={busyAction !== null}
                              onClick={() => handleQuickCreateIssue(selected, th)}
                              className="self-start inline-flex items-center gap-1 text-xs font-bold text-[#d900d8] hover:underline cursor-pointer disabled:opacity-50"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              {isHy ? "Դարձնել խնդիր" : "Promote to Issue"}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted">
                    {isHy
                      ? "Սեղմեք «Թարմացնել AI»՝ մեկնաբանություններն ամփոփելու համար։"
                      : "Click Refresh AI to summarize comments."}
                  </p>
                )}
              </div>

              {/* Cohort Issues with 1-Click Status */}
              <div className="bento-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-primary flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {isHy ? "Այս խմբի խնդիրները" : "Cohort Issues"} (
                    {selected.issues.length})
                  </h3>
                  <Link
                    href="/issues"
                    className="text-xs font-semibold text-[#d900d8] hover:underline"
                  >
                    {isHy ? "Բոլոր խնդիրները →" : "All issues →"}
                  </Link>
                </div>

                {selected.issues.length === 0 ? (
                  <p className="text-xs text-muted">
                    {isHy
                      ? "Այս խմբի համար գրանցված խնդիրներ չկան։"
                      : "No tracked issues for this cohort."}
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {selected.issues.map((issue) => (
                      <div
                        key={issue.id}
                        className="bento-inner p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
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
                              {issue.isOverdue &&
                                ` (${t.dashboard.overdueTag})`}
                            </span>
                          </div>
                        </div>

                        {canManage ? (
                          <div className="inline-flex rounded-xl bg-[var(--surface)] border border-[var(--border)] p-0.5 gap-0.5 shrink-0">
                            {(
                              ["OPEN", "IN_PROGRESS", "RESOLVED", "VERIFIED"] as const
                            ).map((st) => {
                              const active = issue.status === st;
                              return (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => handleIssueStatus(issue.id, st)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                                    active
                                      ? st === "VERIFIED"
                                        ? "bg-emerald-600 text-white"
                                        : st === "OPEN"
                                          ? "bg-rose-600 text-white"
                                          : st === "IN_PROGRESS"
                                            ? "bg-amber-500 text-white"
                                            : "bg-sky-600 text-white"
                                      : "text-muted hover:text-primary"
                                  }`}
                                >
                                  {t.status[st]}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-muted">
                            {t.status[issue.status as keyof typeof t.status] ??
                              issue.status}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
