"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  ExternalLink,
  Plus,
  Sparkles,
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

  const [selectedId, setSelectedId] = useState<string>(cohorts[0]?.groupId ?? "");
  const [tab, setTab] = useState<"summary" | "issues" | "turnout">("summary");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const selected = cohorts.find((c) => c.groupId === selectedId) ?? cohorts[0] ?? null;
  const survey = selected?.latestSurvey ?? null;

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
    <div className="max-w-6xl mx-auto space-y-5">
      {toast && (
        <div className="bento-card px-5 py-3.5 text-sm font-semibold text-primary flex items-center justify-between gap-2 border-[#d900d8]/40">
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="text-muted cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Clean 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Simple Group Picker */}
        <aside className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h1 className="text-lg font-bold text-primary">
              {isHy ? "Խմբեր" : "Groups"}
            </h1>
            {canManage && (
              <Link
                href="/surveys"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#d900d8] hover:bg-[#b800b7] text-white text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                {isHy ? "Նոր հարցում" : "New Survey"}
              </Link>
            )}
          </div>

          <div className="space-y-2.5">
            {cohorts.map((c) => {
              const isSelected = selected?.groupId === c.groupId;
              const hasAlert =
                (c.latestSurvey?.drops.length ?? 0) > 0 ||
                c.issues.some((i) => i.isOverdue);
              const score = c.latestSurvey?.averages.overall ?? 0;

              return (
                <button
                  key={c.groupId}
                  type="button"
                  onClick={() => {
                    setSelectedId(c.groupId);
                    setTab("summary");
                  }}
                  className={`w-full text-left p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? "bg-[var(--surface)] border-[#d900d8] shadow-md"
                      : "bg-[var(--surface)]/70 border-[var(--border)] hover:bg-[var(--surface)]"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-base font-bold text-primary">
                      {c.groupName}
                    </div>
                    <div className="text-xs text-muted mt-0.5 truncate">
                      {c.lecturerName}
                    </div>
                    <div className="mt-2">
                      {hasAlert ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          {isHy ? "Ուշադրության կարիք ունի" : "Needs attention"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          {isHy ? "Ամեն ինչ լավ է" : "All good"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold text-primary">
                      {score > 0 ? score.toFixed(1) : "—"}
                    </div>
                    <div className="text-[11px] text-muted">/ 5.0</div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* RIGHT: One Calm Card With 3 Clear Tabs */}
        <section className="lg:col-span-8">
          {!selected || !survey ? (
            <div className="bento-card p-12 text-center text-sm text-muted">
              {isHy ? "Ընտրեք խումբ ձախից։" : "Pick a group on the left."}
            </div>
          ) : (
            <div className="bento-card overflow-hidden">
              {/* Calm Header */}
              <div className="p-6 md:p-7 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-primary">
                    {selected.groupName}
                  </h2>
                  <p className="text-sm text-muted mt-0.5">
                    {selected.courseName} · {selected.lecturerName}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {canManage && survey.responseRate < survey.targetResponseRate ? (
                    <button
                      type="button"
                      onClick={() => handleRemind(survey.id)}
                      disabled={busy !== null}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#d900d8] hover:bg-[#b800b7] text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
                    >
                      <Bell className="w-4 h-4" />
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
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#d900d8] hover:bg-[#b800b7] text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
                    >
                      <Sparkles className="w-4 h-4" />
                      {busy === "analyze"
                        ? isHy
                          ? "Թարմացվում է..."
                          : "Updating..."
                        : isHy
                          ? "Թարմացնել AI-ով"
                          : "Update AI Summary"}
                    </button>
                  )}
                </div>
              </div>

              {/* 3 Simple Tabs */}
              <div className="px-6 md:px-7 border-b border-[var(--border)] flex gap-6 text-sm font-semibold">
                <button
                  type="button"
                  onClick={() => setTab("summary")}
                  className={`py-3.5 border-b-2 transition-colors cursor-pointer ${
                    tab === "summary"
                      ? "border-[#d900d8] text-primary"
                      : "border-transparent text-muted hover:text-primary"
                  }`}
                >
                  {isHy ? "Ամփոփում" : "Summary"}
                </button>
                <button
                  type="button"
                  onClick={() => setTab("issues")}
                  className={`py-3.5 border-b-2 transition-colors cursor-pointer ${
                    tab === "issues"
                      ? "border-[#d900d8] text-primary"
                      : "border-transparent text-muted hover:text-primary"
                  }`}
                >
                  {isHy ? "Խնդիրներ" : "Issues"}{" "}
                  {openCount > 0 && (
                    <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-rose-500/15 text-rose-600">
                      {openCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setTab("turnout")}
                  className={`py-3.5 border-b-2 transition-colors cursor-pointer ${
                    tab === "turnout"
                      ? "border-[#d900d8] text-primary"
                      : "border-transparent text-muted hover:text-primary"
                  }`}
                >
                  {isHy ? "Մասնակցություն" : "Turnout"} ({survey.respondedCount}/
                  {survey.totalInvites})
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-6 md:p-7">
                {/* TAB 1: SIMPLE SUMMARY */}
                {tab === "summary" && (
                  <div className="space-y-6">
                    {/* Drop alert if any */}
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

                    {/* Plain AI Paragraph */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-muted">
                        {isHy ? "Ի՞նչ են ասում ուսանողները" : "What students are saying"}
                      </div>
                      <p className="text-base text-primary leading-relaxed">
                        {survey.analysis?.overallSummary ||
                          (isHy
                            ? "Դեռ ամփոփում չկա։"
                            : "No summary available yet.")}
                      </p>
                    </div>

                    {/* 4 Simple Score Bars */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-[var(--border)]">
                      {(
                        [
                          { k: "lectures" as const, label: t.categories.LECTURES },
                          { k: "practice" as const, label: t.categories.PRACTICE },
                          { k: "materials" as const, label: t.categories.MATERIALS },
                          { k: "organization" as const, label: t.categories.ORGANIZATION },
                        ] as const
                      ).map((dim) => {
                        const score = survey.averages[dim.k];
                        const delta = survey.deltas[dim.k];
                        return (
                          <div key={dim.k} className="space-y-1">
                            <div className="text-xs text-muted">{dim.label}</div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold text-primary">
                                {score > 0 ? score.toFixed(1) : "—"}
                              </span>
                              {delta !== null && delta !== 0 && (
                                <span
                                  className={`text-xs font-bold ${
                                    delta < 0 ? "text-rose-600" : "text-emerald-600"
                                  }`}
                                >
                                  {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Top Themes — Ultra Clean List */}
                    {survey.analysis && survey.analysis.themes.length > 0 && (
                      <div className="space-y-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-muted">
                          {isHy ? "Հիմնական թեմաները" : "Main themes"}
                        </div>
                        <div className="divide-y divide-[var(--border)]">
                          {survey.analysis.themes.slice(0, 4).map((th, idx) => (
                            <div
                              key={idx}
                              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-primary">
                                    {th.theme}
                                  </span>
                                  <span className="text-xs font-semibold text-muted">
                                    · {th.count} {isHy ? "հոգի" : "mentions"}
                                  </span>
                                </div>
                                <p className="text-xs text-muted">{th.summary}</p>
                              </div>
                              {canManage && th.sentiment === "NEGATIVE" && (
                                <button
                                  type="button"
                                  onClick={() => handleAddIssue(selected, th)}
                                  disabled={busy !== null}
                                  className="self-start sm:self-center shrink-0 px-3.5 py-1.5 rounded-full border border-[#d900d8]/40 text-xs font-semibold text-[#b800b7] dark:text-[#f066ef] hover:bg-[#d900d8]/10 cursor-pointer"
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

                {/* TAB 2: SIMPLE ISSUES CHECKLIST */}
                {tab === "issues" && (
                  <div className="space-y-3">
                    {selected.issues.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted">
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
                                      : "border-2 border-slate-300"
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

                {/* TAB 3: SIMPLE TURNOUT */}
                {tab === "turnout" && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-3xl font-bold text-primary">
                          {survey.responseRate}%
                        </span>
                        <span className="text-sm text-muted">
                          {survey.respondedCount} / {survey.totalInvites}{" "}
                          {isHy ? "ուսանող պատասխանել է" : "students responded"}
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
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
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#d900d8] hover:bg-[#b800b7] text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
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
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-[var(--border)] text-sm font-semibold text-primary hover:border-[#d900d8]"
                        >
                          {isHy ? "Բացել ուսանողի հարցաթերթիկը" : "Open Student Form"}
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      )}
                      <Link
                        href={`/surveys/${survey.id}`}
                        className="text-sm font-semibold text-muted hover:text-primary ml-auto"
                      >
                        {isHy ? "Ամբողջական մանրամասներ →" : "Full details →"}
                      </Link>
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
