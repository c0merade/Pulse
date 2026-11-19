"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  X,
} from "lucide-react";

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
}: {
  issues: IssueRow[];
  groups: GroupOption[];
}) {
  const router = useRouter();
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Issue Tracker
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Turn recurring survey complaints into owned actions with due dates and next-wave verification.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 shadow-sm cursor-pointer self-start"
        >
          <Plus className="w-4 h-4" />
          New Issue
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-500 font-medium mr-1">Status:</span>
          {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "VERIFIED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === st
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st.replace("_", " ")}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-xs sm:ml-auto">
          <span className="text-slate-500 font-medium">Owner:</span>
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs bg-white"
          >
            <option value="ALL">All Roles</option>
            <option value="EDU_LEAD">Edu Lead</option>
            <option value="ADMIN_LEAD">Admin Lead</option>
            <option value="DIRECTOR">Director</option>
          </select>
        </div>
      </div>

      {/* Issues List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-400">
            No issues match the current filter.
          </div>
        ) : (
          filtered.map((issue) => {
            const isOverdue =
              (issue.status === "OPEN" || issue.status === "IN_PROGRESS") &&
              new Date(issue.dueDate) < now;

            return (
              <div
                key={issue.id}
                className={`bg-white rounded-xl border p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                  isOverdue ? "border-rose-300" : "border-slate-200"
                }`}
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-indigo-600">
                      {issue.group.name}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                      {issue.category}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-medium ${
                        issue.severity === "HIGH"
                          ? "bg-rose-100 text-rose-700"
                          : issue.severity === "MEDIUM"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {issue.severity}
                    </span>
                    {isOverdue && (
                      <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-semibold">
                        OVERDUE
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-semibold text-slate-900">
                    {issue.title}
                  </h3>
                  {issue.description && (
                    <p className="text-sm text-slate-600">{issue.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-500">
                    <span>
                      Owner: <strong className="text-slate-700">{issue.ownerName}</strong>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Due {new Date(issue.dueDate).toLocaleDateString()}
                    </span>
                    {issue.sourceSurvey && (
                      <Link
                        href={`/surveys/${issue.sourceSurvey.id}`}
                        className="text-indigo-600 hover:underline"
                      >
                        From: {issue.sourceSurvey.title}
                      </Link>
                    )}
                    {issue.verifiedBySurvey && (
                      <Link
                        href={`/surveys/${issue.verifiedBySurvey.id}`}
                        className="inline-flex items-center gap-1 text-emerald-700 font-medium hover:underline"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verified in: {issue.verifiedBySurvey.title}
                      </Link>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={issue.status}
                    onChange={(e) => handleStatusChange(issue.id, e.target.value)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                      issue.status === "VERIFIED"
                        ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                        : issue.status === "RESOLVED"
                          ? "bg-sky-50 border-sky-300 text-sky-800"
                          : issue.status === "IN_PROGRESS"
                            ? "bg-amber-50 border-amber-300 text-amber-800"
                            : "bg-rose-50 border-rose-300 text-rose-800"
                    }`}
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="VERIFIED">VERIFIED</option>
                  </select>
                  <button
                    onClick={() => handleDelete(issue.id)}
                    title="Delete issue"
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Create Tracked Issue
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="e.g., Slow down TypeScript practice labs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Group
                  </label>
                  <select
                    value={form.groupId}
                    onChange={(e) => setForm({ ...form, groupId: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="LECTURES">Lectures</option>
                    <option value="PRACTICE">Practice</option>
                    <option value="MATERIALS">Materials</option>
                    <option value="ORGANIZATION">Organization</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Owner
                  </label>
                  <select
                    value={form.ownerRole}
                    onChange={(e) =>
                      setForm({ ...form, ownerRole: e.target.value })
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
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 cursor-pointer"
                >
                  {saving ? "Creating..." : "Create Issue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
