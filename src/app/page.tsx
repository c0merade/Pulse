import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock,
  TrendingDown,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { computeAverages, detectDrops, DropFlag } from "@/lib/analytics";
import { getCurrentUser, getGroupScopeWhere } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { TrendLineChart, TrendPoint } from "@/components/DashboardCharts";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const aiMode = process.env.GEMINI_API_KEY?.trim() ? "GEMINI" : "FALLBACK";
  const groupScope = getGroupScopeWhere(user);

  const [surveys, issues] = await Promise.all([
    prisma.survey.findMany({
      where: { group: groupScope },
      include: {
        group: true,
        invites: { select: { respondedAt: true } },
        responses: true,
        analysis: true,
      },
      orderBy: [{ waveNumber: "asc" }, { scheduledAt: "asc" }],
    }),
    prisma.issue.findMany({
      where: { group: groupScope },
      include: { group: true },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  const activeSurveys = surveys.filter((s) => s.status === "ACTIVE");

  // Average response rate across active surveys
  const activeRates = activeSurveys.map((s) => {
    const total = s.invites.length;
    const done = s.invites.filter((i) => i.respondedAt !== null).length;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  });
  const avgResponseRate =
    activeRates.length > 0
      ? Math.round(activeRates.reduce((a, b) => a + b, 0) / activeRates.length)
      : 0;

  // Compute wave-by-wave academy trend
  const byWave = new Map<
    number,
    Array<{
      lecturesScore: number;
      practiceScore: number;
      materialsScore: number;
      organizationScore: number;
    }>
  >();
  for (const s of surveys) {
    const existing = byWave.get(s.waveNumber) ?? [];
    existing.push(...s.responses);
    byWave.set(s.waveNumber, existing);
  }
  const trendData: TrendPoint[] = Array.from(byWave.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([wave, resps]) => {
      const avg = computeAverages(resps);
      return {
        wave: `Wave ${wave}`,
        lectures: avg.lectures,
        practice: avg.practice,
        materials: avg.materials,
        organization: avg.organization,
      };
    });

  // Detect live drops across latest survey of each group
  const byGroup = new Map<string, typeof surveys>();
  for (const s of surveys) {
    const arr = byGroup.get(s.groupId) ?? [];
    arr.push(s);
    byGroup.set(s.groupId, arr);
  }

  const flaggedDrops: Array<{
    surveyId: string;
    surveyTitle: string;
    groupName: string;
    drop: DropFlag;
  }> = [];

  for (const [, groupSurveys] of byGroup) {
    const sorted = [...groupSurveys].sort((a, b) => a.waveNumber - b.waveNumber);
    if (sorted.length >= 2) {
      const latest = sorted[sorted.length - 1];
      const prev = sorted[sorted.length - 2];
      const drops = detectDrops(
        computeAverages(latest.responses),
        computeAverages(prev.responses)
      );
      for (const drop of drops) {
        flaggedDrops.push({
          surveyId: latest.id,
          surveyTitle: latest.title,
          groupName: latest.group.name,
          drop,
        });
      }
    }
  }

  const now = new Date();
  const openIssues = issues.filter(
    (i) => i.status === "OPEN" || i.status === "IN_PROGRESS"
  );
  const overdueIssues = openIssues.filter((i) => new Date(i.dueDate) < now);
  const verifiedIssues = issues.filter((i) => i.status === "VERIFIED");

  return (
    <AppShell aiMode={aiMode} user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Academy Quality Overview
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Automated survey tracking, AI comment themes, score drops, and verified fixes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/surveys"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <ClipboardList className="w-4 h-4" />
              Manage Surveys
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
              Active Surveys
              <ClipboardList className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">
                {activeSurveys.length}
              </span>
              <span className="text-xs text-slate-500">
                of {surveys.length} total waves
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
              Avg Turnout (Active)
              <Users className="w-4 h-4 text-sky-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">
                {avgResponseRate}%
              </span>
              <span className="text-xs text-slate-500">reminders auto-stop at target</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
              Flagged Score Drops
              <TrendingDown className="w-4 h-4 text-rose-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={`text-3xl font-bold ${
                  flaggedDrops.length > 0 ? "text-rose-600" : "text-emerald-600"
                }`}
              >
                {flaggedDrops.length}
              </span>
              <span className="text-xs text-slate-500">drops ≥ 0.4 pts vs prev wave</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
              Tracked Issues
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">
                {openIssues.length}
              </span>
              <span className="text-xs text-slate-500">
                open ·{" "}
                <span className={overdueIssues.length > 0 ? "text-rose-600 font-semibold" : ""}>
                  {overdueIssues.length} overdue
                </span>{" "}
                · {verifiedIssues.length} verified
              </span>
            </div>
          </div>
        </div>

        {/* Flagged Drops Alert Banner */}
        {flaggedDrops.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-rose-800 font-semibold text-sm mb-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Score Drops Requiring Attention
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {flaggedDrops.map((item, idx) => (
                <Link
                  key={idx}
                  href={`/surveys/${item.surveyId}`}
                  className="flex items-center justify-between bg-white border border-rose-200/80 rounded-lg px-4 py-3 hover:border-rose-400 transition-colors"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {item.groupName} — {item.drop.label}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      {item.drop.previousScore.toFixed(1)} →{" "}
                      <span className="font-semibold text-rose-600">
                        {item.drop.currentScore.toFixed(1)}
                      </span>{" "}
                      ({item.drop.delta.toFixed(2)} pts in {item.surveyTitle})
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-700">
                    Inspect AI Summary <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Main Grid: Trend Chart + Active Surveys */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Academy Score Trends Across Waves
                </h2>
                <p className="text-xs text-slate-500">
                  Average ratings (1–5) across all groups per survey wave
                </p>
              </div>
              <Link
                href="/compare"
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
              >
                Compare groups <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <TrendLineChart data={trendData} />
          </div>

          {/* Active Surveys Snapshot */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900">
                Active Surveys
              </h2>
              <Link
                href="/surveys"
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
              >
                View all
              </Link>
            </div>

            <div className="space-y-3 flex-1">
              {activeSurveys.length === 0 ? (
                <p className="text-sm text-slate-400">No active surveys right now.</p>
              ) : (
                activeSurveys.map((s) => {
                  const total = s.invites.length;
                  const done = s.invites.filter((i) => i.respondedAt !== null).length;
                  const rate = total > 0 ? Math.round((done / total) * 100) : 0;
                  const targetMet = rate >= s.targetResponseRate;

                  return (
                    <Link
                      key={s.id}
                      href={`/surveys/${s.id}`}
                      className="block p-3.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm text-slate-900">
                          {s.group.name}
                        </span>
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            targetMet
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {targetMet ? "Target met" : `Goal ${s.targetResponseRate}%`}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">
                        {s.title}
                      </div>
                      <div className="mt-2.5">
                        <div className="flex justify-between text-xs text-slate-600 mb-1">
                          <span>
                            {done} / {total} responded
                          </span>
                          <span className="font-semibold">{rate}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              targetMet ? "bg-emerald-500" : "bg-indigo-500"
                            }`}
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Recent Issues Table */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Actioned Problems & Verification Status
              </h2>
              <p className="text-xs text-slate-500">
                Issues raised from survey themes with owners, due dates, and next-wave verification
              </p>
            </div>
            <Link
              href="/issues"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
            >
              Open Issue Tracker <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <th className="py-2.5 pr-4 font-medium">Issue</th>
                  <th className="py-2.5 px-3 font-medium">Group</th>
                  <th className="py-2.5 px-3 font-medium">Owner</th>
                  <th className="py-2.5 px-3 font-medium">Due Date</th>
                  <th className="py-2.5 pl-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {issues.slice(0, 6).map((issue) => {
                  const isOverdue =
                    (issue.status === "OPEN" || issue.status === "IN_PROGRESS") &&
                    new Date(issue.dueDate) < now;
                  return (
                    <tr key={issue.id} className="hover:bg-slate-50/70">
                      <td className="py-3 pr-4">
                        <div className="font-medium text-slate-900">{issue.title}</div>
                        <div className="text-xs text-slate-500">{issue.category}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-700">{issue.group.name}</td>
                      <td className="py-3 px-3 text-slate-700">{issue.ownerName}</td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 text-xs ${
                            isOverdue ? "text-rose-600 font-semibold" : "text-slate-600"
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(issue.dueDate).toLocaleDateString()}
                          {isOverdue && " (Overdue)"}
                        </span>
                      </td>
                      <td className="py-3 pl-3">
                        <StatusPill status={issue.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    OPEN: "bg-rose-100 text-rose-700",
    IN_PROGRESS: "bg-amber-100 text-amber-800",
    RESOLVED: "bg-sky-100 text-sky-700",
    VERIFIED: "bg-emerald-100 text-emerald-700",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        styles[status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
