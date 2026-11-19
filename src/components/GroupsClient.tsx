"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ChevronDown,
  ChevronUp,
  Code2,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { DICT, Lang } from "@/lib/i18n";

interface StudentRow {
  id: string;
  name: string;
  email: string;
}

interface GroupRow {
  id: string;
  name: string;
  courseName: string;
  lecturerName: string;
  lecturerEmail: string | null;
  isArchived: boolean;
  students: StudentRow[];
  surveysCount: number;
  issuesCount: number;
}

export function GroupsClient({
  groups,
  syncConfigured,
  lang = "hy",
}: {
  groups: GroupRow[];
  syncConfigured: boolean;
  lang?: Lang;
}) {
  const router = useRouter();
  const t = DICT[lang];
  const [showArchived, setShowArchived] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(
    groups[0]?.id ?? null
  );
  const [showSyncDocs, setShowSyncDocs] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create group modal
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);
  const [groupForm, setGroupForm] = useState({
    name: "",
    courseName: "",
    lecturerName: "",
    lecturerEmail: "",
  });

  // Single student quick-add per group
  const [studentForm, setStudentForm] = useState({ name: "", email: "" });
  const [addingStudent, setAddingStudent] = useState(false);

  // CSV Import modal
  const [csvGroup, setCsvGroup] = useState<GroupRow | null>(null);
  const [csvText, setCsvText] = useState("");
  const [importingCsv, setImportingCsv] = useState(false);

  const visibleGroups = groups.filter((g) => showArchived || !g.isArchived);

  function parseCsv(raw: string): Array<{ name: string; email: string }> {
    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const parsed: Array<{ name: string; email: string }> = [];
    for (const line of lines) {
      const parts = line.split(/[;,]/).map((p) => p.trim().replace(/^"|"$/g, ""));
      if (parts.length < 2) continue;
      const [first, second] = parts;
      if (
        first.toLowerCase() === "name" &&
        second.toLowerCase().includes("email")
      ) {
        continue; // skip header row
      }
      if (second.includes("@")) {
        parsed.push({ name: first, email: second.toLowerCase() });
      }
    }
    return parsed;
  }

  const csvPreview = parseCsv(csvText);

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    setSavingGroup(true);
    setError(null);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(groupForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create group");
      } else {
        setShowGroupModal(false);
        setGroupForm({
          name: "",
          courseName: "",
          lecturerName: "",
          lecturerEmail: "",
        });
        setNotice(`Group "${data.group.name}" created.`);
        setExpandedId(data.group.id);
        router.refresh();
      }
    } finally {
      setSavingGroup(false);
    }
  }

  async function handleToggleArchive(g: GroupRow) {
    const res = await fetch(`/api/groups/${g.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isArchived: !g.isArchived }),
    });
    if (res.ok) {
      setNotice(
        g.isArchived ? `Restored "${g.name}".` : `Archived "${g.name}".`
      );
      router.refresh();
    }
  }

  async function handleAddSingleStudent(e: React.FormEvent, groupId: string) {
    e.preventDefault();
    setAddingStudent(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${groupId}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not add student");
      } else {
        setStudentForm({ name: "", email: "" });
        setNotice("Student added to roster.");
        router.refresh();
      }
    } finally {
      setAddingStudent(false);
    }
  }

  async function handleRemoveStudent(groupId: string, studentId: string) {
    const res = await fetch(`/api/groups/${groupId}/students/${studentId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      router.refresh();
    }
  }

  async function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
  }

  async function handleImportCsv(e: React.FormEvent) {
    e.preventDefault();
    if (!csvGroup || csvPreview.length === 0) return;
    setImportingCsv(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${csvGroup.id}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: csvPreview }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "CSV import failed");
      } else {
        setNotice(
          `CSV Import into ${csvGroup.name}: ${data.created} added, ${data.updated} updated.`
        );
        setCsvGroup(null);
        setCsvText("");
        router.refresh();
      }
    } finally {
      setImportingCsv(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            {t.groups.title}
          </h1>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-1">
            {t.groups.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowSyncDocs((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#ffe600] hover:bg-[#f5d800] text-slate-950 text-sm font-extrabold cursor-pointer"
          >
            <Code2 className="w-4 h-4 stroke-[2.5]" />
            {t.groups.syncApi}
          </button>
          <button
            onClick={() => setShowGroupModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00e5cc] hover:bg-[#00d4bd] text-slate-950 text-sm font-extrabold shadow-[0_0_20px_rgba(0,229,204,0.28)] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            {t.groups.newGroup}
          </button>
        </div>
      </div>

      {notice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-4 py-3 text-sm flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl px-4 py-3 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Platform Sync API Panel */}
      {showSyncDocs && (
        <div className="bg-slate-900 text-slate-100 rounded-xl p-5 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-sm flex items-center gap-2">
              <Code2 className="w-4 h-4 text-indigo-400" />
              Picsart Academy Platform Sync REST API
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                syncConfigured
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-amber-500/20 text-amber-300"
              }`}
            >
              {syncConfigured
                ? "PLATFORM_API_KEY configured"
                : "Set PLATFORM_API_KEY in .env to enable"}
            </span>
          </div>
          <p className="text-slate-300">
            Idempotent upsert endpoints for syncing cohorts and student rosters directly from Picsart Academy&apos;s main platform:
          </p>
          <pre className="bg-slate-950 rounded-lg p-3 overflow-x-auto text-[11px] text-indigo-200">
{`# 1. Sync cohorts
curl -X POST http://localhost:3000/api/v1/sync/groups \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: $PLATFORM_API_KEY" \\
  -d '{"groups":[{"name":"iOS-25","courseName":"SwiftUI & iOS","lecturerName":"Lilit S.","lecturerEmail":"lilit.s@picsart.academy"}]}'

# 2. Sync students into a cohort
curl -X POST http://localhost:3000/api/v1/sync/students \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: $PLATFORM_API_KEY" \\
  -d '{"groupName":"iOS-25","students":[{"name":"Ashot K.","email":"ashot.k@academy.edu"}]}'`}
          </pre>
        </div>
      )}

      {/* Toggle Archived */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Showing {visibleGroups.length} group(s)</span>
        <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="rounded border-slate-300"
          />
          Show archived cohorts
        </label>
      </div>

      {/* Groups Accordion List */}
      <div className="space-y-3">
        {visibleGroups.map((g) => {
          const isOpen = expandedId === g.id;
          return (
            <div
              key={g.id}
              className={`bento-card overflow-hidden ${
                g.isArchived ? "opacity-75" : ""
              }`}
            >
              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                  onClick={() => setExpandedId(isOpen ? null : g.id)}
                  className="text-left flex items-start gap-3 flex-1 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#00e5cc]/15 text-teal-600 dark:text-[#00f0d8] flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-base text-slate-950 dark:text-white">
                        {g.name}
                      </span>
                      {g.isArchived && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/[0.08] text-slate-600 dark:text-slate-400 font-bold">
                          {t.groups.archived}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      {g.courseName} · {t.groups.lecturer}:{" "}
                      <strong className="text-slate-800 dark:text-slate-200">{g.lecturerName}</strong>
                      {g.lecturerEmail && ` (${g.lecturerEmail})`}
                    </div>
                  </div>
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/[0.08] text-slate-800 dark:text-slate-200 font-bold">
                    {g.students.length} {t.groups.students}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/[0.08] text-slate-600 dark:text-slate-400 font-semibold">
                    {g.surveysCount} {t.groups.surveys}
                  </span>
                  <button
                    onClick={() => setCsvGroup(g)}
                    className="inline-flex items-center gap-1 text-xs font-extrabold px-3 py-1.5 rounded-xl bg-[#00e5cc]/15 text-teal-800 dark:text-[#00f0d8] hover:bg-[#00e5cc]/25 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {t.groups.csvImport}
                  </button>
                  <button
                    onClick={() => handleToggleArchive(g)}
                    title={g.isArchived ? "Restore group" : "Archive group"}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    {g.isArchived ? (
                      <RotateCcw className="w-4 h-4" />
                    ) : (
                      <Archive className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setExpandedId(isOpen ? null : g.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-slate-100 bg-slate-50/60 p-5 space-y-4">
                  {/* Inline Add Student */}
                  <form
                    onSubmit={(e) => handleAddSingleStudent(e, g.id)}
                    className="flex flex-col sm:flex-row gap-2"
                  >
                    <input
                      type="text"
                      placeholder="Student full name"
                      value={studentForm.name}
                      onChange={(e) =>
                        setStudentForm({ ...studentForm, name: e.target.value })
                      }
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                      required
                    />
                    <input
                      type="email"
                      placeholder="student@academy.edu"
                      value={studentForm.email}
                      onChange={(e) =>
                        setStudentForm({ ...studentForm, email: e.target.value })
                      }
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                      required
                    />
                    <button
                      type="submit"
                      disabled={addingStudent}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-60 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Add Student
                    </button>
                  </form>

                  {/* Roster Table */}
                  {g.students.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      No students in this group yet. Add one above or use CSV Import.
                    </p>
                  ) : (
                    <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
                      {g.students.map((st) => (
                        <div
                          key={st.id}
                          className="px-3.5 py-2 flex items-center justify-between text-sm"
                        >
                          <div>
                            <span className="font-medium text-slate-900">
                              {st.name}
                            </span>
                            <span className="text-xs text-slate-500 ml-2">
                              {st.email}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveStudent(g.id, st.id)}
                            title="Remove student"
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Create New Cohort
              </h2>
              <button
                onClick={() => setShowGroupModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateGroup} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., DevOps-25"
                  value={groupForm.name}
                  onChange={(e) =>
                    setGroupForm({ ...groupForm, name: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Course Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Kubernetes & Cloud Infrastructure"
                  value={groupForm.courseName}
                  onChange={(e) =>
                    setGroupForm({ ...groupForm, courseName: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Lecturer Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Aram Khachatryan"
                  value={groupForm.lecturerName}
                  onChange={(e) =>
                    setGroupForm({ ...groupForm, lecturerName: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Lecturer Email (for RBAC login access)
                </label>
                <input
                  type="email"
                  placeholder="aram.k@picsart.academy"
                  value={groupForm.lecturerEmail}
                  onChange={(e) =>
                    setGroupForm({
                      ...groupForm,
                      lecturerEmail: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGroupModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingGroup}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 cursor-pointer"
                >
                  {savingGroup ? "Creating..." : "Create Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {csvGroup && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Bulk CSV Student Import
                </h2>
                <p className="text-xs text-slate-500">
                  Target group: <strong>{csvGroup.name}</strong> (format:{" "}
                  <code>name,email</code> per line)
                </p>
              </div>
              <button
                onClick={() => {
                  setCsvGroup(null);
                  setCsvText("");
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleImportCsv} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Upload .csv file (optional)
                </label>
                <input
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  onChange={handleCsvFile}
                  className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Or paste CSV rows directly
                </label>
                <textarea
                  rows={6}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={`name,email\nAnna Sargsyan,anna.s@academy.edu\nArtak Grigoryan,artak.g@academy.edu`}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
                />
              </div>
              <div className="text-xs text-slate-600">
                Detected valid rows:{" "}
                <strong className="text-indigo-700">{csvPreview.length}</strong>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCsvGroup(null);
                    setCsvText("");
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importingCsv || csvPreview.length === 0}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                >
                  {importingCsv
                    ? "Importing..."
                    : `Import ${csvPreview.length} Student(s)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
