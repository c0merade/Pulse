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
import { CustomQuestion, DICT, Lang, SURVEY_TEMPLATES } from "@/lib/i18n";

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
  lang = "hy",
}: {
  surveys: SurveyItem[];
  groups: GroupItem[];
  lang?: Lang;
}) {
  const router = useRouter();
  const t = DICT[lang];
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [runningReminders, setRunningReminders] = useState(false);
  const [reminderNotice, setReminderNotice] = useState<string | null>(null);

  const [form, setForm] = useState({
    groupId: groups[0]?.id ?? "",
    title: lang === "hy" ? "Ամսական Pulse — Ալիք 4" : "Monthly Pulse — Wave 4",
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
    const tpl = SURVEY_TEMPLATES.find((item) => item.id === id);
    setCustomQuestions(tpl ? [...tpl.questions] : []);
  }

  function handleAddCustomQuestion() {
    if (newQuestionLabel.trim().length < 3) return;
    setCustomQuestions((prev) => [
      ...prev,
      { id: `q_${Date.now()}`, label: newQuestionLabel.trim(), type: newQuestionType },
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
          .map(
            (d: { groupName: string; skippedReason?: string }) =>
              `${d.groupName}: ${d.skippedReason}`
          )
          .join(" · ");
        setReminderNotice(
          lang === "hy"
            ? `Ուղարկվեց ${s.remindersSent} հիշեցում (${s.surveysChecked} ակտիվ հարցում)։${skipped ? ` (${skipped})` : ""}`
            : `Sent ${s.remindersSent} reminder(s) across ${s.surveysChecked} active survey(s).${skipped ? ` (${skipped})` : ""}`
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            {t.surveys.title}
          </h1>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-1">
            {t.surveys.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleRunReminders}
            disabled={runningReminders}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ffe600] hover:bg-[#f5d800] text-slate-950 text-sm font-extrabold disabled:opacity-60 transition-all shadow-[0_0_18px_rgba(255,230,0,0.22)] cursor-pointer"
          >
            <Bell className="w-4 h-4 stroke-[2.5]" />
            {runningReminders ? t.surveys.sending : t.surveys.runReminders}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#e000df] hover:bg-[#c400c3] text-white text-sm font-extrabold transition-all shadow-[0_0_22px_rgba(224,0,223,0.34)] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            {t.surveys.scheduleNew}
          </button>
        </div>
      </div>

      {reminderNotice && (
        <div className="bento-card border-[#00e5cc]/50 bg-[#00e5cc]/10 px-4 py-3 text-sm font-bold text-teal-900 dark:text-[#00f0d8] flex items-center justify-between gap-3">
          <span>{reminderNotice}</span>
          <button onClick={() => setReminderNotice(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bento Survey Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {surveys.map((s) => {
          const targetMet = s.responseRate >= s.targetResponseRate;
          const statusLabel = t.status[s.status as keyof typeof t.status] ?? s.status;
          return (
            <div
              key={s.id}
              className="bento-card p-6 flex flex-col justify-between gap-4 hover:border-[#00e5cc]/50 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-teal-700 dark:text-[#00f0d8]">
                        {s.group.name}
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {s.group.lecturerName}
                      </span>
                    </div>
                    <Link
                      href={`/surveys/${s.id}`}
                      className="text-lg font-extrabold text-slate-950 dark:text-white hover:text-teal-600 dark:hover:text-[#00f0d8] mt-0.5 block"
                    >
                      {s.title}
                    </Link>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold shrink-0 ${
                      s.status === "ACTIVE"
                        ? "bg-[#00e5cc]/20 text-teal-800 dark:text-[#00f0d8]"
                        : s.status === "SCHEDULED"
                          ? "bg-[#ffe600]/25 text-amber-800 dark:text-[#ffe600]"
                          : "bg-slate-200 dark:bg-white/[0.08] text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {statusLabel}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-600 dark:text-slate-300">
                      {t.surveys.turnout}:{" "}
                      <strong className="text-slate-950 dark:text-white">
                        {s.respondedCount}/{s.totalInvites}
                      </strong>{" "}
                      ({s.responseRate}%)
                    </span>
                    <span
                      className={
                        targetMet
                          ? "text-teal-700 dark:text-[#00f0d8]"
                          : "text-amber-600 dark:text-[#ffe600]"
                      }
                    >
                      {targetMet
                        ? `${s.targetResponseRate}% ${t.surveys.targetReached}`
                        : `${t.surveys.target}: ${s.targetResponseRate}%`}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 dark:bg-white/[0.08] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        targetMet
                          ? "bg-[#00e5cc] shadow-[0_0_12px_rgba(0,229,204,0.45)]"
                          : "bg-[#ffe600]"
                      }`}
                      style={{ width: `${s.responseRate}%` }}
                    />
                  </div>
                </div>

                {/* Meta badges */}
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold">
                  <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    {t.surveys.closes} {new Date(s.closesAt).toLocaleDateString()}
                  </span>
                  {s.overallScore > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.08] text-slate-800 dark:text-white">
                      {t.surveys.avg} {s.overallScore.toFixed(1)}/5
                    </span>
                  )}
                  {s.hasAnalysis && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#00e5cc]/15 text-teal-800 dark:text-[#00f0d8]">
                      <Sparkles className="w-3 h-3" />
                      {t.surveys.aiSummarized}
                    </span>
                  )}
                  {s.dropsCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400">
                      <TrendingDown className="w-3 h-3" />
                      {s.dropsCount} {t.surveys.dropFlag}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3.5 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between gap-2">
                <Link
                  href={`/surveys/${s.id}`}
                  className="text-sm font-extrabold text-teal-700 dark:text-[#00f0d8] hover:underline"
                >
                  {t.surveys.viewDetails} →
                </Link>
                {s.status === "ACTIVE" && s.samplePendingToken && (
                  <Link
                    href={`/s/${s.samplePendingToken}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] hover:border-[#ffe600] hover:text-amber-600 dark:hover:text-[#ffe600] transition-colors"
                  >
                    {t.surveys.demoForm} <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Schedule Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bento-card max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">
                {t.surveys.modalTitle}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSurvey} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  {t.surveys.group}
                </label>
                <select
                  value={form.groupId}
                  onChange={(e) => setForm({ ...form, groupId: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/[0.12] bg-slate-50 dark:bg-[#1e2229] px-3 py-2 text-sm font-semibold text-slate-950 dark:text-white"
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
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  {t.surveys.surveyTitle}
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/[0.12] bg-slate-50 dark:bg-[#1e2229] px-3 py-2 text-sm font-semibold text-slate-950 dark:text-white"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {t.surveys.startsOn}
                  </label>
                  <input
                    type="date"
                    value={form.scheduledAt}
                    onChange={(e) =>
                      setForm({ ...form, scheduledAt: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 dark:border-white/[0.12] bg-slate-50 dark:bg-[#1e2229] px-3 py-2 text-sm font-semibold text-slate-950 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {t.surveys.closesOn}
                  </label>
                  <input
                    type="date"
                    value={form.closesAt}
                    onChange={(e) => setForm({ ...form, closesAt: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 dark:border-white/[0.12] bg-slate-50 dark:bg-[#1e2229] px-3 py-2 text-sm font-semibold text-slate-950 dark:text-white"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {t.surveys.targetPct}
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
                    className="w-full rounded-xl border border-slate-300 dark:border-white/[0.12] bg-slate-50 dark:bg-[#1e2229] px-3 py-2 text-sm font-semibold text-slate-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {t.surveys.reminderHrs}
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
                    className="w-full rounded-xl border border-slate-300 dark:border-white/[0.12] bg-slate-50 dark:bg-[#1e2229] px-3 py-2 text-sm font-semibold text-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-white/[0.08] space-y-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {t.surveys.template}
                  </label>
                  <select
                    value={templateId}
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-white/[0.12] bg-slate-50 dark:bg-[#1e2229] px-3 py-2 text-xs font-semibold text-slate-950 dark:text-white"
                  >
                    {SURVEY_TEMPLATES.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {lang === "hy" ? tpl.nameHy : tpl.name}
                      </option>
                    ))}
                  </select>
                </div>

                {customQuestions.length > 0 && (
                  <div className="space-y-1.5">
                    {customQuestions.map((q) => (
                      <div
                        key={q.id}
                        className="flex items-center justify-between gap-2 bento-inner px-3 py-1.5 text-xs"
                      >
                        <span className="truncate text-slate-700 dark:text-slate-200 font-semibold">
                          <strong className="text-teal-600 dark:text-[#00f0d8] mr-1">
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
                          className="text-slate-400 hover:text-rose-500 cursor-pointer shrink-0"
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
                    placeholder={t.surveys.addQuestionPlaceholder}
                    value={newQuestionLabel}
                    onChange={(e) => setNewQuestionLabel(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-300 dark:border-white/[0.12] bg-slate-50 dark:bg-[#1e2229] px-2.5 py-1.5 text-xs text-slate-950 dark:text-white"
                  />
                  <select
                    value={newQuestionType}
                    onChange={(e) =>
                      setNewQuestionType(e.target.value as "RATING" | "TEXT")
                    }
                    className="rounded-xl border border-slate-300 dark:border-white/[0.12] bg-slate-50 dark:bg-[#1e2229] px-2 py-1.5 text-xs text-slate-950 dark:text-white"
                  >
                    <option value="RATING">1–5</option>
                    <option value="TEXT">Text</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddCustomQuestion}
                    className="px-3 py-1.5 rounded-xl bg-[#ffe600] text-slate-950 text-xs font-extrabold cursor-pointer"
                  >
                    {t.surveys.addBtn}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-white/[0.12] text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {t.surveys.cancel}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-[#e000df] hover:bg-[#c400c3] text-white text-sm font-extrabold disabled:opacity-60 cursor-pointer"
                >
                  {creating ? t.surveys.creating : t.surveys.createBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
