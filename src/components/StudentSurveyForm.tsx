"use client";

import { useState } from "react";
import { Activity, CheckCircle2, Lock } from "lucide-react";

interface Props {
  token: string;
  studentName: string;
  alreadyResponded: boolean;
  survey: {
    title: string;
    status: string;
    groupName: string;
    courseName: string;
    lecturerName: string;
  };
}

const QUESTIONS = [
  {
    key: "lecturesScore" as const,
    label: "Lectures",
    hint: "Clarity, depth, pacing, and real-world examples",
  },
  {
    key: "practiceScore" as const,
    label: "Practice Sessions",
    hint: "Hands-on exercises, workshop time, and mentor guidance",
  },
  {
    key: "materialsScore" as const,
    label: "Course Materials",
    hint: "Slides, repos, recordings, and documentation quality",
  },
  {
    key: "organizationScore" as const,
    label: "Organization",
    hint: "Schedule clarity, communication, room/Zoom logistics",
  },
];

export function StudentSurveyForm({
  token,
  studentName,
  alreadyResponded,
  survey,
}: Props) {
  const [scores, setScores] = useState({
    lecturesScore: 0,
    practiceScore: 0,
    materialsScore: 0,
    organizationScore: 0,
  });
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(alreadyResponded);
  const [error, setError] = useState<string | null>(null);

  const isComplete =
    scores.lecturesScore > 0 &&
    scores.practiceScore > 0 &&
    scores.materialsScore > 0 &&
    scores.organizationScore > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isComplete) {
      setError("Please rate all 4 dimensions before submitting.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/respond/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...scores, comment }),
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
        <div className="bg-indigo-600 text-white px-6 py-5">
          <div className="flex items-center gap-2 text-indigo-100 text-xs font-medium mb-1">
            <Activity className="w-4 h-4" />
            Pulse Academy Quality Check
          </div>
          <h1 className="text-xl font-bold">{survey.title}</h1>
          <p className="text-sm text-indigo-100 mt-0.5">
            {survey.groupName} · {survey.courseName} ({survey.lecturerName})
          </p>
        </div>

        <div className="p-6">
          {submitted ? (
            <div className="py-8 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h2 className="text-xl font-bold text-slate-900">
                Thank you, {studentName}!
              </h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Your anonymous feedback has been recorded. You will no longer receive reminders for this survey wave.
              </p>
            </div>
          ) : survey.status === "CLOSED" ? (
            <div className="py-8 text-center space-y-2">
              <h2 className="text-lg font-semibold text-slate-900">
                This survey is closed
              </h2>
              <p className="text-sm text-slate-500">
                Thanks for checking in — responses for this wave are no longer being collected.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-600 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  Hi <strong>{studentName}</strong>! Your name is only used to stop reminder emails. Your ratings and comment are stored <strong>anonymously</strong>.
                </span>
              </div>

              {error && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <div className="space-y-5">
                {QUESTIONS.map((q) => (
                  <div key={q.key}>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <label className="text-sm font-semibold text-slate-900">
                        {q.label}
                      </label>
                      <span className="text-xs text-slate-400">1 = Poor · 5 = Great</span>
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

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-1">
                  What&apos;s working well or needs improvement?
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  Optional, but super helpful — our AI groups comments into themes so the Academy can fix real issues fast.
                </p>
                <textarea
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="e.g., Slides were great this week, but the practice session felt a bit rushed..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !isComplete}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
              >
                {submitting ? "Submitting..." : "Submit Anonymous Feedback"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
