"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Calendar,
  ExternalLink,
  Plus,
  Sparkles,
  Trash2,
  TrendingDown,
  X,
} from "lucide-react";
import { CustomQuestion, SURVEY_TEMPLATES } from "@/lib/i18n";

interface GroupItem {
  id: string;
  name: string;
  courseName: string;
  lecturerName: string;
}

interface SurveyItem {
  id: string;
  title: string;
  waveNumber: number;
  status: string;
  scheduledAt: string;
  closesAt: string;
  targetResponseRate: number;
  reminderIntervalHours: number;
  group: GroupItem;
  totalInvites: number;
  respondedCount: number;
  responseRate: number;
  overallScore: number;
  hasAnalysis: boolean;
  dropsCount: number;
  samplePendingToken: string | null;
}

export function SurveysClient({
  surveys,
  groups,
}: {
  surveys: SurveyItem[];
  groups: GroupItem[];
}) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [runningReminders, setRunningReminders] = useState(false);
  const [reminderNotice, setReminderNotice] = useState<string | null>(null);

  const [form, setForm] = useState({
    groupId: groups[0]?.id ?? "",
    title: "Monthly Pulse — Wave 4",
    targetResponseRate: 75,
    reminderIntervalHours: 24,
    scheduledAt: new Date().toISOString().slice(0, 10),
    closesAt: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  });
  const [templateId, setTemplateId] = useState("standard");
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [newQuestionLabel, setNewQuestionLabel] = useState("");
  const [newQuestionType, setNewQuestionType] = useState<"RATING" | "TEXT">("RATING");

  function handleSelectTemplate(id: string) {
    setTemplateId(id);
    const tpl = SURVEY_TEMPLATES.find((t) => t.id === id);
    setCustomQuestions(tpl ? [...tpl.questions] : []);
  }

  function handleAddCustomQuestion() {
    if (newQuestionLabel.trim().length < 3) return;
    setCustomQuestions((prev) => [
      ...prev,
      {
        id: `q_${Date.now()}`,
        label: newQuestionLabel.trim(),
        type: newQuestionType,
      },
    ]);
    setNewQuestionLabel("");
  }

  async function handleCreateSurvey(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, customQuestions }),
      });
      if (res.ok) {
        setShowModal(false);
        setTemplateId("standard");
        setCustomQuestions([]);
        router.refresh();
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleRunReminders() {
    setRunningReminders(true);
    setReminderNotice(null);
    try {
      const res = await fetch("/api/reminders/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const data = await res.json();
      if (res.ok && data.summary) {
        const s = data.summary;
        const skipped = s.details
          .filter((d: { skippedReason?: string }) => d.skippedReason)
          .map((d: { groupName: string; skippedReason?: string }) => `${d.groupName}: ${d.skippedReason}`)
          .join(" · ");
        setReminderNotice(
          `Sent ${s.remindersSent} reminder(s) across ${s.surveysChecked} active survey(s).${
            skipped ? ` (${skipped})` : ""
          }`
        );
        router.refresh();
      }
    } finally {
      setRunningReminders(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Surveys &amp; Automated Reminders
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Schedule recurring quality waves and chase responses automatically until target turnout is reached.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRunReminders}
            disabled={runningReminders}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-60 transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4 text-amber-500" />
            {runningReminders ? "Sending..." : "Run Reminder Cycle"}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Schedule Survey
          </button>
        </div>
      </div>

      {reminderNotice && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl px-4 py-3 text-sm flex items-center justify-between gap-3">
          <span>{reminderNotice}</span>
          <button
            onClick={() => setReminderNotice(null)}
            className="text-indigo-500 hover:text-indigo-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Survey Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {surveys.map((s) => {
          const targetMet = s.responseRate >= s.targetResponseRate;
          return (
            <div
              key={s.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                        {s.group.name}
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-500">
                        {s.group.lecturerName}
                      </span>
                    </div>
                    <Link
                      href={`/surveys/${s.id}`}
                      className="text-base font-semibold text-slate-900 hover:text-indigo-600 mt-0.5 block"
                    >
                      {s.title}
                    </Link>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                      s.status === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-700"
                        : s.status === "SCHEDULED"
                          ? "bg-sky-100 text-sky-700"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {s.status}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-600">
                      Turnout:{" "}
                      <strong className="text-slate-900">
                        {s.respondedCount}/{s.totalInvites}
                      </strong>{" "}
                      ({s.responseRate}%)
                    </span>
                    <span
                      className={
                        targetMet
                          ? "text-emerald-600 font-medium"
                          : "text-amber-600 font-medium"
                      }
                    >
                      {targetMet
                        ? `Target ${s.targetResponseRate}% reached`
                        : `Target: ${s.targetResponseRate}%`}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        targetMet ? "bg-emerald-500" : "bg-indigo-500"
                      }`}
                      style={{ width: `${s.responseRate}%` }}
                    />
                  </div>
                </div>

                {/* Meta badges */}
                <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Closes {new Date(s.closesAt).toLocaleDateString()}
                  </span>
                  {s.overallScore > 0 && (
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                      Avg {s.overallScore.toFixed(1)}/5
                    </span>
                  )}
                  {s.hasAnalysis && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium">
                      <Sparkles className="w-3 h-3" />
                      AI Summarized
                    </span>
                  )}
                  {s.dropsCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-medium">
                      <TrendingDown className="w-3 h-3" />
                      {s.dropsCount} drop flag{s.dropsCount > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <Link
                  href={`/surveys/${s.id}`}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                  View AI Summary &amp; Details →
                </Link>
                {s.status === "ACTIVE" && s.samplePendingToken && (
                  <Link
                    href={`/s/${s.samplePendingToken}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50"
                  >
                    Demo Student Form <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Schedule Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Schedule New Quality Survey
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSurvey} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Group
                </label>
                <select
                  value={form.groupId}
                  onChange={(e) => setForm({ ...form, groupId: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} — {g.courseName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Survey Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Starts On
                  </label>
                  <input
                    type="date"
                    value={form.scheduledAt}
                    onChange={(e) =>
                      setForm({ ...form, scheduledAt: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Closes On
                  </label>
                  <input
                    type="date"
                    value={form.closesAt}
                    onChange={(e) => setForm({ ...form, closesAt: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Target Turnout (%)
                  </label>
                  <input
                    type="number"
                    min={20}
                    max={100}
                    value={form.targetResponseRate}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        targetResponseRate: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Reminder Every (hrs)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={168}
                    value={form.reminderIntervalHours}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        reminderIntervalHours: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Survey Template
                  </label>
                  <select
                    value={templateId}
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white"
                  >
                    {SURVEY_TEMPLATES.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name}
                      </option>
                    ))}
                  </select>
                </div>

                {customQuestions.length > 0 && (
                  <div className="space-y-1.5">
                    {customQuestions.map((q) => (
                      <div
                        key={q.id}
                        className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                      >
                        <span className="truncate text-slate-700">
                          <strong className="text-indigo-600 mr-1">
                            [{q.type === "RATING" ? "1-5" : "Text"}]
                          </strong>
                          {q.label}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setCustomQuestions((prev) =>
                              prev.filter((item) => item.id !== q.id)
                            )
                          }
                          className="text-slate-400 hover:text-rose-600 cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Add custom question (optional)..."
                    value={newQuestionLabel}
                    onChange={(e) => setNewQuestionLabel(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                  />
                  <select
                    value={newQuestionType}
                    onChange={(e) =>
                      setNewQuestionType(e.target.value as "RATING" | "TEXT")
                    }
                    className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs bg-white"
                  >
                    <option value="RATING">1–5</option>
                    <option value="TEXT">Text</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddCustomQuestion}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 cursor-pointer"
                >
                  {creating ? "Scheduling..." : "Create & Generate Invites"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
