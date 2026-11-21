"use client";

import { useState } from "react";
import { CheckCircle2, Lock } from "lucide-react";
import { CustomQuestion, DICT, Lang } from "@/lib/i18n";
import { PulseLogo } from "./PulseLogo";

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
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center p-3 sm:p-4 transition-colors">
      <div className="w-full max-w-xl bento-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#111418] text-white px-4 py-5 sm:px-6 sm:py-6 flex items-start justify-between gap-3 border-b border-white/[0.08]">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[#ffe600] text-xs font-extrabold uppercase tracking-wider mb-1.5">
              <PulseLogo className="w-5 h-5 shrink-0" />
              {t.badge}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold">{survey.title}</h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">
              {survey.groupName} · {survey.courseName} ({survey.lecturerName})
            </p>
          </div>
          <div className="inline-flex items-center rounded-xl bg-white/[0.08] p-0.5 text-[11px] font-extrabold shrink-0">
            <button
              type="button"
              onClick={() => setLang("hy")}
              className={`px-2.5 py-1.5 rounded-lg cursor-pointer ${
                lang === "hy" ? "bg-[#e000df] text-white" : "text-slate-300"
              }`}
            >
              ՀԱՅ
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`px-2.5 py-1.5 rounded-lg cursor-pointer ${
                lang === "en" ? "bg-[#e000df] text-white" : "text-slate-300"
              }`}
            >
              ENG
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {submitted ? (
            <div className="py-8 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h2 className="text-xl font-bold text-primary">
                {t.thankYou} {studentName}!
              </h2>
              <p className="text-sm text-muted max-w-md mx-auto">
                {t.thankYouBody}
              </p>
            </div>
          ) : survey.status === "CLOSED" ? (
            <div className="py-8 text-center space-y-2">
              <h2 className="text-lg font-semibold text-primary">
                {t.closedTitle}
              </h2>
              <p className="text-sm text-muted">{t.closedBody}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="rounded-xl bento-inner px-3.5 py-3 text-xs text-muted flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-[#d900d8] shrink-0 mt-0.5" />
                <span>
                  {t.anonNoticePrefix} <strong className="text-primary">{studentName}</strong>!{" "}
                  {t.anonNoticeBody}
                </span>
              </div>

              {error && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-4 py-2.5 text-sm text-rose-600 dark:text-rose-400">
                  {error}
                </div>
              )}

              <div className="space-y-5">
                {questions.map((q) => (
                  <div key={q.key}>
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <label className="text-sm font-semibold text-primary">
                        {q.label}
                      </label>
                      <span className="text-[11px] text-muted shrink-0">{t.scaleHint}</span>
                    </div>
                    <p className="text-xs text-muted mb-2.5">{q.hint}</p>
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map((val) => {
                        const selected = scores[q.key] === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setScores({ ...scores, [q.key]: val })}
                            className={`min-h-[48px] rounded-xl border text-base sm:text-sm font-extrabold transition-all active:scale-95 cursor-pointer ${
                              selected
                                ? "bg-[#e000df] border-[#e000df] text-white shadow-[0_0_18px_rgba(224,0,223,0.4)]"
                                : "bento-inner text-primary hover:border-[#e000df]"
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
                <div className="pt-4 border-t border-[var(--border)] space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#d900d8]">
                    {t.extraSection}
                  </div>
                  {survey.customQuestions.map((cq) => (
                    <div key={cq.id}>
                      <label className="block text-sm font-semibold text-primary mb-2">
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
                                className={`min-h-[44px] rounded-xl border text-base sm:text-sm font-semibold active:scale-95 transition-all cursor-pointer ${
                                  selected
                                    ? "bg-[#e000df] border-[#e000df] text-white"
                                    : "bento-inner text-primary hover:border-[#e000df]"
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
                          className="w-full rounded-xl pulse-input px-3.5 py-2.5 text-base sm:text-sm"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-primary mb-1">
                  {t.commentLabel}
                </label>
                <p className="text-xs text-muted mb-2">{t.commentHint}</p>
                <textarea
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t.commentPlaceholder}
                  className="w-full rounded-xl pulse-input px-3.5 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#d900d8]/30 focus:border-[#d900d8]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !isComplete}
                className="w-full min-h-[48px] py-3.5 rounded-xl bg-[#e000df] hover:bg-[#c400c3] text-white text-sm font-extrabold disabled:opacity-50 transition-all active:scale-[0.99] shadow-[0_0_22px_rgba(224,0,223,0.34)] cursor-pointer"
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
