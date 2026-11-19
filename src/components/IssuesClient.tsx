"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Plus, Trash2, X } from "lucide-react";
import { DICT, Lang } from "@/lib/i18n";

interface IssueRow {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  ownerRole: string;
  ownerName: string;
  dueDate: string;
  group: { id: string; name: string };
  sourceSurvey: { id: string; title: string } | null;
  verifiedBySurvey: { id: string; title: string } | null;
}

interface GroupOption {
  id: string;
  name: string;
}

export function IssuesClient({
  issues,
  groups,
  lang = "hy",
}: {
  issues: IssueRow[];
  groups: GroupOption[];
  lang?: Lang;
}) {
  const router = useRouter();
  const t = DICT[lang];
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [ownerFilter, setOwnerFilter] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "PRACTICE",
    severity: "MEDIUM",
    ownerRole: "EDU_LEAD",
    groupId: groups[0]?.id ?? "",
    dueDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
  });

  const now = new Date();
  const filtered = issues.filter((i) => {
    if (statusFilter !== "ALL" && i.status !== statusFilter) return false;
    if (ownerFilter !== "ALL" && i.ownerRole !== ownerFilter) return false;
    return true;
  });

  async function handleStatusChange(issueId: string, newStatus: string) {
    await fetch(`/api/issues/${issueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    router.refresh();
  }

  async function handleDelete(issueId: string) {
    await fetch(`/api/issues/${issueId}`, { method: "DELETE" });
    router.refresh();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowModal(false);
        setForm({ ...form, title: "", description: "" });
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            {t.issues.title}
          </h1>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-1">
            {t.issues.subtitle}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00e5cc] hover:bg-[#00d4bd] text-slate-950 text-sm font-extrabold shadow-[0_0_20px_rgba(0,229,204,0.28)] cursor-pointer self-start"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          {t.issues.newIssue}
        </button>
      </div>

      {/* Filters */}
      <div className="bento-card p-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-bold mr-1">
            {t.issues.statusLabel}:
          </span>
          {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "VERIFIED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-extrabold transition-all cursor-pointer ${
                statusFilter === st
                  ? "bg-[#00e5cc] text-slate-950"
                  : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/[0.1]"
              }`}
            >
              {st === "ALL"
                ? t.issues.all
                : t.status[st as keyof typeof t.status] ?? st}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs sm:ml-auto">
          <span className="text-slate-500 dark:text-slate-400 font-bold">
            {t.issues.ownerLabel}:
          </span>
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="rounded-xl border border-slate-300 dark:border-white/[0.12] bg-slate-50 dark:bg-[#1e2229] px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white"
          >
            <option value="ALL">{t.issues.allRoles}</option>
            <option value="EDU_LEAD">{t.roles.EDU_LEAD}</option>
            <option value="ADMIN_LEAD">{t.roles.ADMIN_LEAD}</option>
            <option value="DIRECTOR">{t.roles.DIRECTOR}</option>
          </select>
        </div>
      </div>

      {/* Issues List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bento-card p-10 text-center text-sm font-semibold text-slate-400">
            {t.issues.empty}
          </div>
        ) : (
          filtered.map((issue) => {
            const isOverdue =
              (issue.status === "OPEN" || issue.status === "IN_PROGRESS") &&
              new Date(issue.dueDate) < now;

            return (
              <div
                key={issue.id}
                className={`bento-card p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                  isOverdue ? "border-rose-500/50" : ""
                }`}
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-extrabold text-teal-700 dark:text-[#00f0d8]">
                      {issue.group.name}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300 font-bold">
                      {t.categories[issue.category as keyof typeof t.categories] ??
                        issue.category}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-extrabold ${
                        issue.severity === "HIGH"
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                          : issue.severity === "MEDIUM"
                            ? "bg-[#ffe600]/25 text-amber-800 dark:text-[#ffe600]"
                            : "bg-slate-100 dark:bg-white/[0.08] text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {issue.severity}
                    </span>
                    {isOverdue && (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white font-extrabold">
                        {t.dashboard.overdueTag.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-extrabold text-slate-950 dark:text-white">
                    {issue.title}
                  </h3>
                  {issue.description && (
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {issue.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 pt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <span>
                      {t.issues.ownerLabel}:{" "}
                      <strong className="text-slate-900 dark:text-white">
                        {issue.ownerName}
                      </strong>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {t.issues.due} {new Date(issue.dueDate).toLocaleDateString()}
                    </span>
                    {issue.sourceSurvey && (
                      <Link
                        href={`/surveys/${issue.sourceSurvey.id}`}
                        className="text-teal-700 dark:text-[#00f0d8] hover:underline"
                      >
                        {t.issues.from}: {issue.sourceSurvey.title}
                      </Link>
                    )}
                    {issue.verifiedBySurvey && (
                      <Link
                        href={`/surveys/${issue.verifiedBySurvey.id}`}
                        className="inline-flex items-center gap-1 text-teal-700 dark:text-[#00f0d8] font-bold hover:underline"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {t.issues.verifiedIn}: {issue.verifiedBySurvey.title}
                      </Link>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={issue.status}
                    onChange={(e) => handleStatusChange(issue.id, e.target.value)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-extrabold cursor-pointer ${
                      issue.status === "VERIFIED"
                        ? "bg-[#00e5cc]/20 border-[#00e5cc]/50 text-teal-900 dark:text-[#00f0d8]"
                        : issue.status === "RESOLVED"
                          ? "bg-sky-500/15 border-sky-500/40 text-sky-800 dark:text-sky-300"
                          : issue.status === "IN_PROGRESS"
                            ? "bg-[#ffe600]/25 border-[#ffe600]/50 text-amber-900 dark:text-[#ffe600]"
                            : "bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-400"
                    }`}
                  >
                    <option value="OPEN">{t.status.OPEN}</option>
                    <option value="IN_PROGRESS">{t.status.IN_PROGRESS}</option>
                    <option value="RESOLVED">{t.status.RESOLVED}</option>
                    <option value="VERIFIED">{t.status.VERIFIED}</option>
                  </select>
                  <button
                    onClick={() => handleDelete(issue.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Issue Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bento-card max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">
                {t.issues.modalTitle}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  {t.issues.fieldTitle}
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/[0.12] bg-slate-50 dark:bg-[#1e2229] px-3 py-2 text-sm font-semibold text-slate-950 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  {t.issues.fieldDesc}
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 dark:border-white/[0.12] bg-slate-50 dark:bg-[#1e2229] px-3 py-2 text-sm text-slate-950 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {t.issues.fieldGroup}
                  </label>
                  <select
                    value={form.groupId}
                    onChange={(e) => setForm({ ...form, groupId: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 dark:border-white/[0.12] bg-slate-50 dark:bg-[#1e2229] px-3 py-2 text-sm font-semibold text-slate-950 dark:text-white"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {t.issues.fieldCat}
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 dark:border-white/[0.12] bg-slate-50 dark:bg-[#1e2229] px-3 py-2 text-sm font-semibold text-slate-950 dark:text-white"
                  >
                    <option value="LECTURES">{t.categories.LECTURES}</option>
                    <option value="PRACTICE">{t.categories.PRACTICE}</option>
                    <option value="MATERIALS">{t.categories.MATERIALS}</option>
                    <option value="ORGANIZATION">{t.categories.ORGANIZATION}</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {t.issues.fieldOwner}
                  </label>
                  <select
                    value={form.ownerRole}
                    onChange={(e) => setForm({ ...form, ownerRole: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 dark:border-white/[0.12] bg-slate-50 dark:bg-[#1e2229] px-3 py-2 text-sm font-semibold text-slate-950 dark:text-white"
                  >
                    <option value="EDU_LEAD">{t.roles.EDU_LEAD}</option>
                    <option value="ADMIN_LEAD">{t.roles.ADMIN_LEAD}</option>
                    <option value="DIRECTOR">{t.roles.DIRECTOR}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {t.issues.fieldDue}
                  </label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 dark:border-white/[0.12] bg-slate-50 dark:bg-[#1e2229] px-3 py-2 text-sm font-semibold text-slate-950 dark:text-white"
                    required
                  />
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
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-[#00e5cc] hover:bg-[#00d4bd] text-slate-950 text-sm font-extrabold disabled:opacity-60 cursor-pointer"
                >
                  {saving ? t.issues.creating : t.issues.create}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
