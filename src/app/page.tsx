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
  Zap,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { computeAverages, detectDrops, DropFlag } from "@/lib/analytics";
import { getCurrentUser, getGroupScopeWhere } from "@/lib/auth";
import { DICT } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";
import { AppShell } from "@/components/AppShell";
import { TrendLineChart, TrendPoint } from "@/components/DashboardCharts";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const lang = await getServerLang();
  const t = DICT[lang];
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

  const activeRates = activeSurveys.map((s) => {
    const total = s.invites.length;
    const done = s.invites.filter((i) => i.respondedAt !== null).length;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  });
  const avgResponseRate =
    activeRates.length > 0
      ? Math.round(activeRates.reduce((a, b) => a + b, 0) / activeRates.length)
      : 0;

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
        wave: lang === "hy" ? `Ալիք ${wave}` : `Wave ${wave}`,
        lectures: avg.lectures,
        practice: avg.practice,
        materials: avg.materials,
        organization: avg.organization,
      };
    });

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
    <AppShell aiMode={aiMode} user={user} initialLang={lang}>
      <div className="space-y-6">
        {/* Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
              {t.dashboard.title}
            </h1>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-1">
              {t.dashboard.subtitle}
            </p>
          </div>
          <Link
            href="/surveys"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00e5cc] hover:bg-[#00d4bd] text-slate-950 text-sm font-extrabold transition-all shadow-[0_0_20px_rgba(0,229,204,0.28)] self-start"
          >
            <ClipboardList className="w-4 h-4 stroke-[2.5]" />
            {t.dashboard.manageSurveys}
          </Link>
        </div>

        {/* Bento KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bento-card p-5">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t.dashboard.kpiActive}
              <span className="w-8 h-8 rounded-xl bg-[#00e5cc]/15 text-teal-600 dark:text-[#00f0d8] flex items-center justify-center">
                <ClipboardList className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-slate-950 dark:text-white">
                {activeSurveys.length}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                / {surveys.length} {t.dashboard.kpiTotalWaves}
              </span>
            </div>
          </div>

          <div className="bento-card p-5">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted">
              {t.dashboard.kpiTurnout}
              <span className="w-8 h-8 rounded-xl bg-[#ffe600]/20 text-yellow-accent flex items-center justify-center">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3">
              <div className="text-4xl font-extrabold text-primary">
                {avgResponseRate}%
              </div>
              <div className="text-xs font-semibold text-muted mt-1">
                {t.dashboard.kpiAutoStop}
              </div>
            </div>
          </div>

          <div className="bento-card p-5">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t.dashboard.kpiDrops}
              <span className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span
                className={`text-4xl font-extrabold ${
                  flaggedDrops.length > 0
                    ? "text-rose-500"
                    : "text-teal-600 dark:text-[#00f0d8]"
                }`}
              >
                {flaggedDrops.length}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t.dashboard.kpiDropHint}
              </span>
            </div>
          </div>

          <div className="bento-card p-5">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t.dashboard.kpiIssues}
              <span className="w-8 h-8 rounded-xl bg-[#00e5cc]/15 text-teal-600 dark:text-[#00f0d8] flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-slate-950 dark:text-white">
                {openIssues.length}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t.dashboard.kpiOpen} ·{" "}
                <span className={overdueIssues.length > 0 ? "text-rose-500 font-bold" : ""}>
                  {overdueIssues.length} {t.dashboard.kpiOverdue}
                </span>{" "}
                · {verifiedIssues.length} {t.dashboard.kpiVerified}
              </span>
            </div>
          </div>
        </div>

        {/* Flagged Drops Highlight Banner (Bright Yellow / Rose Accent) */}
        {flaggedDrops.length > 0 && (
          <div className="bento-card p-5 border-[#ffe600]/40 bg-amber-50/70 dark:bg-[#1c1b14]">
            <div className="flex items-center gap-2.5 text-sm font-extrabold text-slate-950 dark:text-[#ffe600] mb-3">
              <span className="w-6 h-6 rounded-full bg-[#ffe600] text-slate-950 flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
              </span>
              {t.dashboard.dropBanner}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {flaggedDrops.map((item, idx) => (
                <Link
                  key={idx}
                  href={`/surveys/${item.surveyId}`}
                  className="flex items-center justify-between bento-inner px-4 py-3.5 hover:border-[#ffe600] transition-colors"
                >
                  <div>
                    <div className="text-sm font-extrabold text-slate-950 dark:text-white">
                      {item.groupName} — {item.drop.label}
                    </div>
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
                      {item.drop.previousScore.toFixed(1)} →{" "}
                      <span className="text-rose-500 font-extrabold">
                        {item.drop.currentScore.toFixed(1)}
                      </span>{" "}
                      ({item.drop.delta.toFixed(2)})
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-extrabold text-teal-700 dark:text-[#00f0d8]">
                    {t.dashboard.inspectAi} <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Main Bento Grid: Trend Chart + Active Surveys */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bento-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">
                  {t.dashboard.trendTitle}
                </h2>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t.dashboard.trendSub}
                </p>
              </div>
              {user.role !== "LECTURER" && (
                <Link
                  href="/compare"
                  className="text-xs font-extrabold text-teal-700 dark:text-[#00f0d8] hover:underline inline-flex items-center gap-1"
                >
                  {t.dashboard.compareGroups} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
            <TrendLineChart data={trendData} lang={lang} />
          </div>

          {/* Active Surveys Bento Card */}
          <div className="bento-card p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">
                {t.dashboard.activeSurveys}
              </h2>
              <Link
                href="/surveys"
                className="text-xs font-extrabold text-teal-700 dark:text-[#00f0d8] hover:underline"
              >
                {t.dashboard.viewAll}
              </Link>
            </div>

            <div className="space-y-3 flex-1">
              {activeSurveys.length === 0 ? (
                <p className="text-sm text-slate-400">{t.dashboard.noActive}</p>
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
                      className="block bento-inner p-4 hover:border-[#00e5cc] transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-sm text-primary whitespace-nowrap">
                          {s.group.name}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full whitespace-nowrap ${
                            targetMet
                              ? "bg-[#00e5cc]/20 text-teal-800 dark:text-[#00f0d8]"
                              : "bg-[#ffe600]/25 text-amber-800 dark:text-[#ffe600]"
                          }`}
                        >
                          <Zap className="w-2.5 h-2.5 fill-current" />
                          {targetMet
                            ? t.dashboard.targetMet
                            : `${t.dashboard.goal} ${s.targetResponseRate}%`}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {s.title}
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                          <span>
                            {done} / {total} {t.dashboard.responded}
                          </span>
                          <span className="text-slate-950 dark:text-white">{rate}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 dark:bg-white/[0.08] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              targetMet
                                ? "bg-[#00e5cc] shadow-[0_0_10px_rgba(0,229,204,0.5)]"
                                : "bg-[#ffe600]"
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

        {/* Recent Issues Bento Table */}
        <div className="bento-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">
                {t.dashboard.issuesTitle}
              </h2>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t.dashboard.issuesSub}
              </p>
            </div>
            <Link
              href="/issues"
              className="text-xs font-extrabold text-teal-700 dark:text-[#00f0d8] hover:underline inline-flex items-center gap-1"
            >
              {t.dashboard.openTracker} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/[0.08] text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                  <th className="py-3 pr-4">{t.dashboard.colIssue}</th>
                  <th className="py-3 px-3">{t.dashboard.colGroup}</th>
                  <th className="py-3 px-3">{t.dashboard.colOwner}</th>
                  <th className="py-3 px-3">{t.dashboard.colDue}</th>
                  <th className="py-3 pl-3">{t.dashboard.colStatus}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                {issues.slice(0, 6).map((issue) => {
                  const isOverdue =
                    (issue.status === "OPEN" || issue.status === "IN_PROGRESS") &&
                    new Date(issue.dueDate) < now;
                  const statusLabel =
                    t.status[issue.status as keyof typeof t.status] ?? issue.status;
                  return (
                    <tr
                      key={issue.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-white/[0.03]"
                    >
                      <td className="py-3.5 pr-4">
                        <div className="font-bold text-slate-950 dark:text-white">
                          {issue.title}
                        </div>
                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {t.categories[issue.category as keyof typeof t.categories] ??
                            issue.category}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-bold text-teal-700 dark:text-[#00f0d8]">
                        {issue.group.name}
                      </td>
                      <td className="py-3.5 px-3 text-slate-700 dark:text-slate-300 font-medium">
                        {issue.ownerName}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-bold ${
                            isOverdue
                              ? "text-rose-500"
                              : "text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(issue.dueDate).toLocaleDateString()}
                          {isOverdue && ` (${t.dashboard.overdueTag})`}
                        </span>
                      </td>
                      <td className="py-3.5 pl-3">
                        <StatusPill status={issue.status} label={statusLabel} />
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

function StatusPill({ status, label }: { status: string; label: string }) {
  const styles: Record<string, string> = {
    OPEN: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30",
    IN_PROGRESS:
      "bg-[#ffe600]/20 text-amber-800 dark:text-[#ffe600] border border-[#ffe600]/40",
    RESOLVED:
      "bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30",
    VERIFIED:
      "bg-[#00e5cc]/20 text-teal-800 dark:text-[#00f0d8] border border-[#00e5cc]/40",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
        styles[status] ?? "bg-slate-200 text-slate-700"
      }`}
    >
      {label}
    </span>
  );
}
