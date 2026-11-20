"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  PlusCircle,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import type { DropFlag, ScoreAverages, ThemeCluster } from "@/lib/analytics";
import { DICT, Lang } from "@/lib/i18n";

interface SurveyDetailProps {
  lang?: Lang;
  survey: {
    id: string;
    title: string;
    waveNumber: number;
    status: string;
    targetResponseRate: number;
    closesAt: string;
    group: {
      id: string;
      name: string;
      courseName: string;
      lecturerName: string;
    };
    totalInvites: number;
    respondedCount: number;
    responseRate: number;
    averages: ScoreAverages;
    previousSurvey: {
      id: string;
      title: string;
      waveNumber: number;
      averages: ScoreAverages;
    } | null;
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
      analyzedAt: string;
    } | null;
    invites: Array<{
      id: string;
      token: string;
      studentName: string;
      studentEmail: string;
      respondedAt: string | null;
      remindersSent: number;
    }>;
    responses: Array<{
      id: string;
      lecturesScore: number;
      practiceScore: number;
      materialsScore: number;
      organizationScore: number;
      comment: string;
      submittedAt: string;
    }>;
    reminderLogs: Array<{
      id: string;
      studentName: string;
      studentEmail: string;
      message: string;
      sentAt: string;
    }>;
    groupIssues: Array<{
      id: string;
      title: string;
      category: string;
      status: string;
      ownerName: string;
      dueDate: string;
      sourceSurveyId: string | null;
      verifiedBySurveyId: string | null;
    }>;
  };
}

export function SurveyDetailClient({ survey, lang = "hy" }: SurveyDetailProps) {
  const router = useRouter();
  const isHy = lang === "hy";
  const t = DICT[lang];

  const [analyzing, setAnalyzing] = useState(false);
  const [reminding, setReminding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"ai" | "responses" | "reminders">("ai");

  const [issueModal, setIssueModal] = useState<{
    title: string;
    description: string;
    category: "LECTURES" | "PRACTICE" | "MATERIALS" | "ORGANIZATION";
    severity: "LOW" | "MEDIUM" | "HIGH";
    ownerRole: "EDU_LEAD" | "ADMIN_LEAD" | "DIRECTOR";
    dueDate: string;
    themeName: string;
  } | null>(null);
  const [savingIssue, setSavingIssue] = useState(false);

  const sentimentLabel = (s: string) => {
    if (!isHy) return s;
    if (s === "POSITIVE") return "ԴՐԱԿԱՆ";
    if (s === "NEGATIVE") return "ԲԱՑԱՍԱԿԱՆ";
    return "ՉԵԶՈՔ";
  };

  const severityLabel = (s: string) => {
    if (!isHy) return s;
    if (s === "HIGH") return "ԲԱՐՁՐ";
    if (s === "MEDIUM") return "ՄԻՋԻՆ";
    return "ՑԱԾՐ";
  };

  async function handleRunAnalysis() {
    setAnalyzing(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/surveys/${survey.id}/analyze`, {
        method: "POST",
      });
      if (res.ok) {
        setNotice(
          isHy
            ? "AI թեմաների խմբավորումն ու ամփոփումը թարմացվեցին։"
            : "AI theme clustering and summary updated."
        );
        router.refresh();
      }
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSendReminders() {
    setReminding(true);
    setNotice(null);
    try {
      const res = await fetch("/api/reminders/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surveyId: survey.id, force: true }),
      });
      const data = await res.json();
      if (res.ok && data.summary) {
        const d = data.summary.details[0];
        setNotice(
          d?.skippedReason
            ? d.skippedReason
            : isHy
              ? `Ուղարկվեց ${data.summary.remindersSent} հիշեցում չպատասխանած ուսանողներին։`
              : `Sent ${data.summary.remindersSent} reminder(s) to pending students.`
        );
        router.refresh();
      }
    } finally {
      setReminding(false);
    }
  }

  function openIssueFromTheme(theme: ThemeCluster) {
    const defaultRole =
      theme.category === "ORGANIZATION" ? "ADMIN_LEAD" : "EDU_LEAD";
    const defaultDue = new Date(Date.now() + 14 * 86400000)
      .toISOString()
      .slice(0, 10);
    setIssueModal({
      title: isHy ? `Լուծել՝ ${theme.theme}` : `Address: ${theme.theme}`,
      description: `${theme.summary} (${theme.count} ${
        isHy ? "ուսանողական հիշատակում" : "student mentions"
      } — ${survey.title})։`,
      category: theme.category,
      severity: theme.severity,
      ownerRole: defaultRole,
      dueDate: defaultDue,
      themeName: theme.theme,
    });
  }

  async function handleCreateIssue(e: React.FormEvent) {
    e.preventDefault();
    if (!issueModal) return;
    setSavingIssue(true);
    try {
      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...issueModal,
          groupId: survey.group.id,
          sourceSurveyId: survey.id,
        }),
      });
      if (res.ok) {
        setIssueModal(null);
        setNotice(
          isHy
            ? "Խնդիրը ստեղծվեց և ավելացվեց Խնդիրների թրեքերում։"
            : "Issue created and assigned in Issue Tracker."
        );
        router.refresh();
      }
    } finally {
      setSavingIssue(false);
    }
  }

  async function handleVerifyIssue(issueId: string) {
    const res = await fetch(`/api/issues/${issueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "VERIFIED",
        verifiedBySurveyId: survey.id,
      }),
    });
    if (res.ok) {
      setNotice(
        isHy
          ? "Խնդիրը նշվեց որպես ՀԱՍՏԱՏՎԱԾ՝ այս հարցման արդյունքների հիման վրա։"
          : "Issue marked as VERIFIED based on this wave's results."
      );
      router.refresh();
    }
  }

  const scoreCards = [
    { key: "lectures" as const, label: t.categories.LECTURES, score: survey.averages.lectures, delta: survey.deltas.lectures },
    { key: "practice" as const, label: t.categories.PRACTICE, score: survey.averages.practice, delta: survey.deltas.practice },
    { key: "materials" as const, label: t.categories.MATERIALS, score: survey.averages.materials, delta: survey.deltas.materials },
    { key: "organization" as const, label: t.categories.ORGANIZATION, score: survey.averages.organization, delta: survey.deltas.organization },
  ];

  const verifiableIssues = survey.groupIssues.filter(
    (i) => i.sourceSurveyId !== survey.id && i.status === "RESOLVED"
  );

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div>
        <Link
          href="/surveys"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-cyan-accent mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />{" "}
          {isHy ? "Վերադառնալ հարցումներին" : "Back to Surveys"}
        </Link>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-accent">
                {survey.group.name}
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-semibold text-slate-500">
                {survey.group.courseName} ({survey.group.lecturerName})
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-primary mt-0.5">
              {survey.title}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {survey.status === "ACTIVE" && (
              <button
                onClick={handleSendReminders}
                disabled={reminding}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#ffe600] hover:bg-[#f5d800] text-slate-950 text-sm font-extrabold disabled:opacity-60 cursor-pointer"
              >
                <Bell className="w-4 h-4 stroke-[2.5]" />
                {reminding
                  ? isHy
                    ? "Ուղարկվում է..."
                    : "Reminding..."
                  : isHy
                    ? "Հիշեցնել չպատասխանածներին"
                    : "Remind Pending"}
              </button>
            )}
            <button
              onClick={handleRunAnalysis}
              disabled={analyzing || survey.responses.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#e000df] hover:bg-[#c400c3] text-white text-sm font-extrabold disabled:opacity-60 shadow-[0_0_22px_rgba(224,0,223,0.34)] cursor-pointer"
            >
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
              {analyzing
                ? isHy
                  ? "Վերլուծվում է..."
                  : "Analyzing..."
                : survey.analysis
                  ? isHy
                    ? "Թարմացնել AI ամփոփումը"
                    : "Re-run AI Summary"
                  : isHy
                    ? "Գործարկել AI ամփոփումը"
                    : "Run AI Summary"}
            </button>
          </div>
        </div>
      </div>

      {notice && (
        <div className="bento-card border-[#00e5cc]/50 bg-[#00e5cc]/10 text-cyan-accent px-4 py-3 text-sm font-bold flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Score Cards with Wave-over-Wave Delta */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {scoreCards.map((c) => {
          const isDrop = c.delta !== null && c.delta <= -0.4;
          const isGain = c.delta !== null && c.delta >= 0.4;
          return (
            <div
              key={c.key}
              className={`bento-card p-5 ${
                isDrop ? "border-rose-500/50" : ""
              }`}
            >
              <div className="text-xs font-bold text-muted">{c.label}</div>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span className="text-3xl font-extrabold text-primary">
                  {c.score > 0 ? c.score.toFixed(2) : "—"}
                  <span className="text-xs font-semibold text-muted"> /5</span>
                </span>
                {c.delta !== null && (
                  <span
                    className={`inline-flex items-center gap-0.5 text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                      isDrop
                        ? "bg-rose-500/15 text-rose-500"
                        : isGain
                          ? "bg-[#00e5cc]/20 text-cyan-accent"
                          : "bg-slate-100 text-muted"
                    }`}
                  >
                    {c.delta < 0 ? (
                      <TrendingDown className="w-3 h-3" />
                    ) : c.delta > 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : null}
                    {c.delta > 0 ? `+${c.delta.toFixed(2)}` : c.delta.toFixed(2)}
                  </span>
                )}
              </div>
              {survey.previousSurvey && (
                <div className="text-[11px] font-semibold text-muted mt-1.5">
                  {isHy
                    ? `Ալիք ${survey.previousSurvey.waveNumber}-ի համեմատ`
                    : `vs Wave ${survey.previousSurvey.waveNumber}`}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Previous Resolved Issues Ready for Verification */}
      {verifiableIssues.length > 0 && (
        <div className="bento-card p-5 border-[#00e5cc]/40 bg-[#00e5cc]/[0.06]">
          <div className="flex items-center gap-2 text-cyan-accent font-extrabold text-sm mb-3">
            <CheckCircle2 className="w-4 h-4" />
            {isHy
              ? "Հաստատել նախորդ լուծված խնդիրները այս հարցումով"
              : "Verify Previous Fixes With This Survey"}
          </div>
          <div className="space-y-2">
            {verifiableIssues.map((issue) => (
              <div
                key={issue.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bento-inner px-4 py-3"
              >
                <div>
                  <div className="text-sm font-extrabold text-primary">
                    {issue.title}
                  </div>
                  <div className="text-xs font-medium text-muted">
                    {t.categories[issue.category as keyof typeof t.categories] ??
                      issue.category}{" "}
                    · {issue.ownerName}
                  </div>
                </div>
                <button
                  onClick={() => handleVerifyIssue(issue.id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#00e5cc] text-slate-950 text-xs font-extrabold cursor-pointer shrink-0"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isHy ? "Հաստատել լուծումը" : "Confirm Fixed (Verify)"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-[var(--border)] flex gap-6 text-sm font-extrabold">
        <button
          onClick={() => setActiveTab("ai")}
          className={`pb-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === "ai"
              ? "border-[#e000df] text-primary"
              : "border-transparent text-muted hover:text-primary"
          }`}
        >
          {isHy ? "AI Թեմաներ և Ամփոփում" : "AI Themes & Summary"}
        </button>
        <button
          onClick={() => setActiveTab("responses")}
          className={`pb-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === "responses"
              ? "border-[#e000df] text-primary"
              : "border-transparent text-muted hover:text-primary"
          }`}
        >
          {isHy ? "Անանուն մեկնաբանություններ" : "Anonymous Comments"} (
          {survey.responses.length})
        </button>
        <button
          onClick={() => setActiveTab("reminders")}
          className={`pb-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === "reminders"
              ? "border-[#e000df] text-primary"
              : "border-transparent text-muted hover:text-primary"
          }`}
        >
          {isHy ? "Մասնակցություն և Հիշեցումներ" : "Turnout & Reminders"} (
          {survey.respondedCount}/{survey.totalInvites})
        </button>
      </div>

      {/* TAB 1: AI Themes & Summary */}
      {activeTab === "ai" && (
        <div className="space-y-5">
          {survey.drops.length > 0 && (
            <div className="bento-warn p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-accent shrink-0 mt-0.5" />
              <div className="text-sm font-medium text-primary">
                <strong className="font-extrabold text-yellow-accent">
                  {isHy ? "Ավտոմատ անկման ահազանգ․" : "Automatic Drop Flag:"}
                </strong>{" "}
                {survey.drops
                  .map(
                    (d) =>
                      `${d.label} (${d.previousScore.toFixed(1)} → ${d.currentScore.toFixed(
                        1
                      )}, ${d.delta.toFixed(2)})`
                  )
                  .join("; ")}
              </div>
            </div>
          )}

          {survey.analysis ? (
            <>
              <div className="bento-card p-5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 font-extrabold text-primary">
                    <Sparkles className="w-4 h-4 text-[#e000df]" />
                    {isHy ? "Ընդհանուր ամփոփում" : "Executive Summary"}
                  </div>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 text-muted font-bold">
                    {survey.analysis.source === "GEMINI"
                      ? "Gemini AI"
                      : isHy
                        ? "Ավտոմատ AI ամփոփում"
                        : "Automated AI Summary"}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-700 leading-relaxed">
                  {survey.analysis.overallSummary}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {survey.analysis.themes.map((theme, idx) => (
                  <div
                    key={idx}
                    className="bento-card p-5 flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                              {t.categories[
                                theme.category as keyof typeof t.categories
                              ] ?? theme.category}
                            </span>
                            <span
                              className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                                theme.sentiment === "NEGATIVE"
                                  ? "bg-rose-500/15 text-rose-600"
                                  : theme.sentiment === "POSITIVE"
                                    ? "bg-[#00e5cc]/20 text-cyan-accent"
                                    : "bg-slate-100 text-muted"
                              }`}
                            >
                              {sentimentLabel(theme.sentiment)}
                            </span>
                          </div>
                          <h3 className="text-base font-extrabold text-primary mt-1">
                            {theme.theme}
                          </h3>
                        </div>
                        <span className="shrink-0 px-2.5 py-1 rounded-full bg-[#ffe600]/20 text-yellow-accent text-xs font-extrabold">
                          {theme.count}{" "}
                          {isHy
                            ? "հիշատակում"
                            : `mention${theme.count !== 1 ? "s" : ""}`}
                        </span>
                      </div>

                      <p className="text-sm font-medium text-muted mt-2">
                        {theme.summary}
                      </p>

                      {theme.quotes.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {theme.quotes.map((q, qIdx) => (
                            <blockquote
                              key={qIdx}
                              className="text-xs text-slate-600 bento-inner border-l-2 border-l-[#00e5cc] pl-3 py-2 italic"
                            >
                              &ldquo;{q}&rdquo;
                            </blockquote>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted">
                        {isHy ? "Կարևորություն" : "Severity"}:{" "}
                        <strong className="text-primary">
                          {severityLabel(theme.severity)}
                        </strong>
                      </span>
                      <button
                        onClick={() => openIssueFromTheme(theme)}
                        className="inline-flex items-center gap-1 text-xs font-extrabold text-[#e000df] hover:underline cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        {isHy ? "Ստեղծել խնդիր" : "Create Tracked Issue"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="bento-card p-10 text-center">
              <Sparkles className="w-8 h-8 text-[#e000df] mx-auto mb-2" />
              <p className="text-sm font-medium text-muted">
                {isHy
                  ? "AI ամփոփումը դեռ գեներացված չէ։ Սեղմեք վերևի կոճակը՝ մեկնաբանությունները խմբավորելու համար։"
                  : "No AI summary generated yet. Click Run AI Summary above to cluster student comments."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Anonymous Comments */}
      {activeTab === "responses" && (
        <div className="space-y-3">
          {survey.responses.map((r) => (
            <div key={r.id} className="bento-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted mb-2">
                <div className="flex items-center gap-2 font-bold text-primary">
                  <MessageSquare className="w-3.5 h-3.5 text-cyan-accent" />
                  {isHy ? "Անանուն ուսանող" : "Anonymous Student"}
                </div>
                <div className="flex flex-wrap items-center gap-3 font-semibold">
                  <span>
                    {t.categories.LECTURES}: <strong className="text-primary">{r.lecturesScore}</strong>
                  </span>
                  <span>
                    {t.categories.PRACTICE}: <strong className="text-primary">{r.practiceScore}</strong>
                  </span>
                  <span>
                    {t.categories.MATERIALS}: <strong className="text-primary">{r.materialsScore}</strong>
                  </span>
                  <span>
                    {t.categories.ORGANIZATION}: <strong className="text-primary">{r.organizationScore}</strong>
                  </span>
                </div>
              </div>
              <p className="text-sm font-medium text-primary">
                {r.comment || (
                  <span className="italic text-muted">
                    {isHy ? "Գրավոր մեկնաբանություն չկա։" : "No written comment."}
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: Turnout & Reminders */}
      {activeTab === "reminders" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bento-card p-5">
            <h3 className="font-extrabold text-primary mb-3">
              {isHy ? "Ուսանողների հրավերներ" : "Student Invites"} (
              {survey.respondedCount}/{survey.totalInvites} — {survey.responseRate}%)
            </h3>
            <div className="divide-y divide-slate-100 text-sm">
              {survey.invites.map((inv) => (
                <div
                  key={inv.id}
                  className="py-2.5 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-bold text-primary">{inv.studentName}</div>
                    <div className="text-xs text-muted">
                      {inv.studentEmail} · {inv.remindersSent}{" "}
                      {isHy ? "հիշեցում" : "reminder(s)"}
                    </div>
                  </div>
                  {inv.respondedAt ? (
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-[#00e5cc]/20 text-cyan-accent">
                      {isHy ? "Պատասխանել է" : "Responded"}
                    </span>
                  ) : (
                    <Link
                      href={`/s/${inv.token}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-xs font-extrabold text-[#e000df] px-2.5 py-1 rounded-lg border border-[#e000df]/40 hover:bg-[#e000df]/10"
                    >
                      {isHy ? "Բացել հղումը" : "Open Link"}{" "}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bento-card p-5">
            <h3 className="font-extrabold text-primary mb-3">
              {isHy ? "Հիշեցումների պատմություն" : "Reminder Log"}
            </h3>
            {survey.reminderLogs.length === 0 ? (
              <p className="text-sm text-muted">
                {isHy
                  ? "Այս հարցման համար հիշեցումներ դեռ չեն ուղարկվել։"
                  : "No reminders sent for this survey yet."}
              </p>
            ) : (
              <div className="space-y-3">
                {survey.reminderLogs.map((log) => (
                  <div key={log.id} className="p-3 bento-inner text-xs">
                    <div className="flex justify-between font-bold text-primary mb-1">
                      <span>
                        {log.studentName} ({log.studentEmail})
                      </span>
                      <span className="text-muted">
                        {new Date(log.sentAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-muted">{log.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Issue Modal */}
      {issueModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bento-card max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-primary">
                {t.issues.modalTitle}
              </h2>
              <button
                onClick={() => setIssueModal(null)}
                className="text-muted hover:text-primary cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateIssue} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-muted mb-1">
                  {t.issues.fieldTitle}
                </label>
                <input
                  type="text"
                  value={issueModal.title}
                  onChange={(e) =>
                    setIssueModal({ ...issueModal, title: e.target.value })
                  }
                  className="w-full rounded-xl pulse-input px-3 py-2 text-sm font-semibold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted mb-1">
                  {t.issues.fieldDesc}
                </label>
                <textarea
                  rows={3}
                  value={issueModal.description}
                  onChange={(e) =>
                    setIssueModal({ ...issueModal, description: e.target.value })
                  }
                  className="w-full rounded-xl pulse-input px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted mb-1">
                    {t.issues.fieldOwner}
                  </label>
                  <select
                    value={issueModal.ownerRole}
                    onChange={(e) =>
                      setIssueModal({
                        ...issueModal,
                        ownerRole: e.target.value as "EDU_LEAD" | "ADMIN_LEAD" | "DIRECTOR",
                      })
                    }
                    className="w-full rounded-xl pulse-input px-3 py-2 text-sm font-semibold"
                  >
                    <option value="EDU_LEAD">{t.roles.EDU_LEAD}</option>
                    <option value="ADMIN_LEAD">{t.roles.ADMIN_LEAD}</option>
                    <option value="DIRECTOR">{t.roles.DIRECTOR}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted mb-1">
                    {t.issues.fieldDue}
                  </label>
                  <input
                    type="date"
                    value={issueModal.dueDate}
                    onChange={(e) =>
                      setIssueModal({ ...issueModal, dueDate: e.target.value })
                    }
                    className="w-full rounded-xl pulse-input px-3 py-2 text-sm font-semibold"
                    required
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIssueModal(null)}
                  className="px-4 py-2 rounded-xl border border-[var(--border)] text-sm font-bold text-muted cursor-pointer"
                >
                  {t.surveys.cancel}
                </button>
                <button
                  type="submit"
                  disabled={savingIssue}
                  className="px-4 py-2 rounded-xl bg-[#e000df] hover:bg-[#c400c3] text-white text-sm font-extrabold disabled:opacity-60 cursor-pointer"
                >
                  {savingIssue ? t.issues.creating : t.issues.create}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
