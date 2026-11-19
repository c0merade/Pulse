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

interface SurveyDetailProps {
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

export function SurveyDetailClient({ survey }: SurveyDetailProps) {
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState(false);
  const [reminding, setReminding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"ai" | "responses" | "reminders">("ai");

  // Create issue modal state
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

  async function handleRunAnalysis() {
    setAnalyzing(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/surveys/${survey.id}/analyze`, {
        method: "POST",
      });
      if (res.ok) {
        setNotice("AI theme clustering and summary updated.");
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
      title: `Address: ${theme.theme}`,
      description: `${theme.summary} (${theme.count} student mentions in ${survey.title}).`,
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
        setNotice("Issue created and assigned in Issue Tracker.");
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
      setNotice("Issue marked as VERIFIED based on this wave's results.");
      router.refresh();
    }
  }

  const scoreCards = [
    { key: "lectures" as const, label: "Lectures", score: survey.averages.lectures, delta: survey.deltas.lectures },
    { key: "practice" as const, label: "Practice Sessions", score: survey.averages.practice, delta: survey.deltas.practice },
    { key: "materials" as const, label: "Materials", score: survey.averages.materials, delta: survey.deltas.materials },
    { key: "organization" as const, label: "Organization", score: survey.averages.organization, delta: survey.deltas.organization },
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
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-indigo-600 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Surveys
        </Link>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                {survey.group.name}
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-500">
                {survey.group.courseName} ({survey.group.lecturerName})
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-950 dark:text-white mt-0.5">
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
                {reminding ? "Ուղարկվում է..." : "Հիշեցնել չպատասխանածներին"}
              </button>
            )}
            <button
              onClick={handleRunAnalysis}
              disabled={analyzing || survey.responses.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#e000df] hover:bg-[#c400c3] text-white text-sm font-extrabold disabled:opacity-60 shadow-[0_0_22px_rgba(224,0,223,0.34)] cursor-pointer"
            >
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
              {analyzing
                ? "Վերլուծվում է..."
                : survey.analysis
                  ? "Թարմացնել AI ամփոփումը"
                  : "Գործարկել AI ամփոփումը"}
            </button>
          </div>
        </div>
      </div>

      {notice && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl px-4 py-3 text-sm flex items-center justify-between">
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
              className={`bg-white rounded-xl border p-4 shadow-xs ${
                isDrop ? "border-rose-300 bg-rose-50/30" : "border-slate-200"
              }`}
            >
              <div className="text-xs font-medium text-slate-500">{c.label}</div>
              <div className="mt-1.5 flex items-baseline justify-between gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {c.score > 0 ? c.score.toFixed(2) : "—"}
                  <span className="text-xs font-normal text-slate-400"> /5</span>
                </span>
                {c.delta !== null && (
                  <span
                    className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                      isDrop
                        ? "bg-rose-100 text-rose-700"
                        : isGain
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
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
                <div className="text-[11px] text-slate-400 mt-1">
                  vs Wave {survey.previousSurvey.waveNumber}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Previous Resolved Issues Ready for Verification */}
      {verifiableIssues.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Verify Previous Fixes With This Survey
          </div>
          <div className="space-y-2">
            {verifiableIssues.map((issue) => (
              <div
                key={issue.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white border border-emerald-200/80 rounded-lg px-4 py-3"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {issue.title}
                  </div>
                  <div className="text-xs text-slate-500">
                    Category: {issue.category} · Owner: {issue.ownerName} · Marked Resolved
                  </div>
                </div>
                <button
                  onClick={() => handleVerifyIssue(issue.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 cursor-pointer shrink-0"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Confirm Fixed (Verify)
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab("ai")}
          className={`pb-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === "ai"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          AI Themes &amp; Summary
        </button>
        <button
          onClick={() => setActiveTab("responses")}
          className={`pb-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === "responses"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Anonymous Comments ({survey.responses.length})
        </button>
        <button
          onClick={() => setActiveTab("reminders")}
          className={`pb-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === "reminders"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Turnout &amp; Reminders ({survey.respondedCount}/{survey.totalInvites})
        </button>
      </div>

      {/* TAB 1: AI Themes & Summary */}
      {activeTab === "ai" && (
        <div className="space-y-5">
          {survey.drops.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-sm text-rose-900">
                <strong className="font-semibold">Automatic Drop Flag:</strong>{" "}
                {survey.drops
                  .map(
                    (d) =>
                      `${d.label} dropped ${Math.abs(d.delta).toFixed(2)} pts (${d.previousScore.toFixed(
                        1
                      )} → ${d.currentScore.toFixed(1)})`
                  )
                  .join("; ")}
                . Review the negative themes below and turn recurring complaints into tracked issues.
              </div>
            </div>
          )}

          {survey.analysis ? (
            <>
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 font-semibold text-slate-900">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    Executive Summary
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                    Engine: {survey.analysis.source}
                  </span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {survey.analysis.overallSummary}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {survey.analysis.themes.map((theme, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                              {theme.category}
                            </span>
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                theme.sentiment === "NEGATIVE"
                                  ? "bg-rose-100 text-rose-700"
                                  : theme.sentiment === "POSITIVE"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {theme.sentiment}
                            </span>
                          </div>
                          <h3 className="text-base font-semibold text-slate-900 mt-1">
                            {theme.theme}
                          </h3>
                        </div>
                        <span className="shrink-0 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold">
                          {theme.count} mention{theme.count !== 1 ? "s" : ""}
                        </span>
                      </div>

                      <p className="text-sm text-slate-600 mt-2">{theme.summary}</p>

                      {theme.quotes.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {theme.quotes.map((q, qIdx) => (
                            <blockquote
                              key={qIdx}
                              className="text-xs text-slate-600 bg-slate-50 border-l-2 border-slate-300 pl-3 py-1.5 italic rounded-r"
                            >
                              &ldquo;{q}&rdquo;
                            </blockquote>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        Severity: <strong className="text-slate-600">{theme.severity}</strong>
                      </span>
                      <button
                        onClick={() => openIssueFromTheme(theme)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        Create Tracked Issue
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
              <Sparkles className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600">
                No AI summary generated yet. Click <strong>Run AI Summary</strong> above to cluster student comments into themes.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Anonymous Comments */}
      {activeTab === "responses" && (
        <div className="space-y-3">
          {survey.responses.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 mb-2">
                <div className="flex items-center gap-2 font-medium text-slate-700">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                  Anonymous Student
                </div>
                <div className="flex items-center gap-2">
                  <span>Lectures: <strong>{r.lecturesScore}</strong></span>
                  <span>Practice: <strong>{r.practiceScore}</strong></span>
                  <span>Materials: <strong>{r.materialsScore}</strong></span>
                  <span>Org: <strong>{r.organizationScore}</strong></span>
                </div>
              </div>
              <p className="text-sm text-slate-800">
                {r.comment || <span className="italic text-slate-400">No written comment.</span>}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: Turnout & Reminders */}
      {activeTab === "reminders" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="font-semibold text-slate-900 mb-3">
              Student Invites ({survey.respondedCount}/{survey.totalInvites} — {survey.responseRate}%)
            </h3>
            <div className="divide-y divide-slate-100 text-sm">
              {survey.invites.map((inv) => (
                <div
                  key={inv.id}
                  className="py-2.5 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-medium text-slate-900">{inv.studentName}</div>
                    <div className="text-xs text-slate-500">
                      {inv.studentEmail} · {inv.remindersSent} reminder(s)
                    </div>
                  </div>
                  {inv.respondedAt ? (
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      Responded
                    </span>
                  ) : (
                    <Link
                      href={`/s/${inv.token}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 px-2.5 py-1 rounded-md border border-indigo-200 bg-indigo-50/50"
                    >
                      Open Link <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="font-semibold text-slate-900 mb-3">
              Reminder Log (Simulated Emails)
            </h3>
            {survey.reminderLogs.length === 0 ? (
              <p className="text-sm text-slate-400">No reminders sent for this survey yet.</p>
            ) : (
              <div className="space-y-3">
                {survey.reminderLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs"
                  >
                    <div className="flex justify-between font-medium text-slate-800 mb-1">
                      <span>To: {log.studentName} ({log.studentEmail})</span>
                      <span className="text-slate-400">
                        {new Date(log.sentAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-600">{log.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Issue Modal */}
      {issueModal && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Create Tracked Issue
              </h2>
              <button
                onClick={() => setIssueModal(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateIssue} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={issueModal.title}
                  onChange={(e) =>
                    setIssueModal({ ...issueModal, title: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={issueModal.description}
                  onChange={(e) =>
                    setIssueModal({ ...issueModal, description: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Owner Role
                  </label>
                  <select
                    value={issueModal.ownerRole}
                    onChange={(e) =>
                      setIssueModal({
                        ...issueModal,
                        ownerRole: e.target.value as "EDU_LEAD" | "ADMIN_LEAD" | "DIRECTOR",
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="EDU_LEAD">Edu Lead</option>
                    <option value="ADMIN_LEAD">Admin Lead</option>
                    <option value="DIRECTOR">Director</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={issueModal.dueDate}
                    onChange={(e) =>
                      setIssueModal({ ...issueModal, dueDate: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIssueModal(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingIssue}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 cursor-pointer"
                >
                  {savingIssue ? "Saving..." : "Create Issue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
