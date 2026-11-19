"use client";

import { useState } from "react";
import { Activity, CheckCircle2, Lock } from "lucide-react";
import { CustomQuestion, DICT, Lang } from "@/lib/i18n";

interface Props {
  token: string;
  studentName: string;
  alreadyResponded: boolean;
  initialLang?: Lang;
  survey: {
    title: string;
    status: string;
    groupName: string;
    courseName: string;
    lecturerName: string;
    customQuestions: CustomQuestion[];
  };
}

export function StudentSurveyForm({
  token,
  studentName,
  alreadyResponded,
  initialLang = "en",
  survey,
}: Props) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [scores, setScores] = useState({
    lecturesScore: 0,
    practiceScore: 0,
    materialsScore: 0,
    organizationScore: 0,
  });
  const [customAnswers, setCustomAnswers] = useState<Record<string, string | number>>({});
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(alreadyResponded);
  const [error, setError] = useState<string | null>(null);

  const t = DICT[lang].studentForm;

  const questions = [
    { key: "lecturesScore" as const, label: t.lectures, hint: t.lecturesHint },
    { key: "practiceScore" as const, label: t.practice, hint: t.practiceHint },
    { key: "materialsScore" as const, label: t.materials, hint: t.materialsHint },
    { key: "organizationScore" as const, label: t.organization, hint: t.organizationHint },
  ];

  const isComplete =
    scores.lecturesScore > 0 &&
    scores.practiceScore > 0 &&
    scores.materialsScore > 0 &&
    scores.organizationScore > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isComplete) {
      setError(t.rateAllError);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/respond/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...scores, comment, customAnswers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not submit your response.");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-indigo-600 text-white px-6 py-5 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-indigo-100 text-xs font-medium mb-1">
              <Activity className="w-4 h-4" />
              {t.badge}
            </div>
            <h1 className="text-xl font-bold">{survey.title}</h1>
            <p className="text-sm text-indigo-100 mt-0.5">
              {survey.groupName} · {survey.courseName} ({survey.lecturerName})
            </p>
          </div>
          <div className="inline-flex items-center rounded-lg bg-indigo-700/80 p-0.5 text-[11px] font-semibold shrink-0">
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`px-2 py-0.5 rounded-md cursor-pointer ${
                lang === "en" ? "bg-white text-indigo-700" : "text-indigo-100"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang("hy")}
              className={`px-2 py-0.5 rounded-md cursor-pointer ${
                lang === "hy" ? "bg-white text-indigo-700" : "text-indigo-100"
              }`}
            >
              ՀԱՅ
            </button>
          </div>
        </div>

        <div className="p-6">
          {submitted ? (
            <div className="py-8 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h2 className="text-xl font-bold text-slate-900">
                {t.thankYou} {studentName}!
              </h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                {t.thankYouBody}
              </p>
            </div>
          ) : survey.status === "CLOSED" ? (
            <div className="py-8 text-center space-y-2">
              <h2 className="text-lg font-semibold text-slate-900">
                {t.closedTitle}
              </h2>
              <p className="text-sm text-slate-500">{t.closedBody}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-600 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  {t.anonNoticePrefix} <strong>{studentName}</strong>!{" "}
                  {t.anonNoticeBody}
                </span>
              </div>

              {error && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <div className="space-y-5">
                {questions.map((q) => (
                  <div key={q.key}>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <label className="text-sm font-semibold text-slate-900">
                        {q.label}
                      </label>
                      <span className="text-xs text-slate-400">{t.scaleHint}</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">{q.hint}</p>
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map((val) => {
                        const selected = scores[q.key] === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setScores({ ...scores, [q.key]: val })}
                            className={`py-2.5 rounded-lg border text-sm font-semibold transition-all cursor-pointer ${
                              selected
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                                : "bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/40"
                            }`}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Custom Template Questions */}
              {survey.customQuestions.length > 0 && (
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    {t.extraSection}
                  </div>
                  {survey.customQuestions.map((cq) => (
                    <div key={cq.id}>
                      <label className="block text-sm font-semibold text-slate-900 mb-2">
                        {cq.label}
                      </label>
                      {cq.type === "RATING" ? (
                        <div className="grid grid-cols-5 gap-2">
                          {[1, 2, 3, 4, 5].map((val) => {
                            const selected = customAnswers[cq.id] === val;
                            return (
                              <button
                                key={val}
                                type="button"
                                onClick={() =>
                                  setCustomAnswers({ ...customAnswers, [cq.id]: val })
                                }
                                className={`py-2 rounded-lg border text-sm font-semibold cursor-pointer ${
                                  selected
                                    ? "bg-indigo-600 border-indigo-600 text-white"
                                    : "bg-white border-slate-200 text-slate-700 hover:border-indigo-300"
                                }`}
                              >
                                {val}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={String(customAnswers[cq.id] ?? "")}
                          onChange={(e) =>
                            setCustomAnswers({
                              ...customAnswers,
                              [cq.id]: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-1">
                  {t.commentLabel}
                </label>
                <p className="text-xs text-slate-500 mb-2">{t.commentHint}</p>
                <textarea
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t.commentPlaceholder}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !isComplete}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
              >
                {submitting ? t.submitting : t.submit}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
