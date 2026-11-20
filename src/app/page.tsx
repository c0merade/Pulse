import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  TrendingDown,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { computeAverages, detectDrops, DropFlag } from "@/lib/analytics";
import { getCurrentUser, getGroupScopeWhere } from "@/lib/auth";
import { DICT } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";
import { AppShell } from "@/components/AppShell";
import { TrendLineChart, TrendPoint } from "@/components/DashboardCharts";
import { QuickActionsBar } from "@/components/QuickActionsBar";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const lang = await getServerLang();
  const isHy = lang === "hy";
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
        wave: isHy ? `Ալիք ${wave}` : `Wave ${wave}`,
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
  const firstName = user.name.split(" ")[0];

  return (
    <AppShell aiMode={aiMode} user={user} initialLang={lang}>
      <div className="space-y-8">
        {/* Clean Friendly Greeting */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">
            {isHy ? `Բարի գալուստ, ${firstName}` : `Welcome back, ${firstName}`}
          </h1>
          <p className="text-sm font-medium text-muted mt-1">
            {isHy
              ? "Ամենակարևորը՝ մեկ էջում։ Սկսեք հարցում, ուղարկեք հիշեցում կամ ստուգեք խնդիրները։"
              : "Everything important in one simple view. Start a survey, nudge students, or review open issues."}
          </p>
        </div>

        {/* 1-Click Quick Actions */}
        <QuickActionsBar lang={lang} canManage={user.role !== "LECTURER"} />

        {/* 3 Spacious, Crystal-Clear KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bento-card p-6">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted">
              {t.dashboard.kpiTurnout}
              <Users className="w-4 h-4 text-yellow-accent" />
            </div>
            <div className="text-4xl font-extrabold text-primary mt-3">
              {avgResponseRate}%
            </div>
            <div className="text-xs font-semibold text-muted mt-1">
              {activeSurveys.length}{" "}
              {isHy ? "ակտիվ հարցում հիմա" : "active surveys right now"}
            </div>
          </div>

          <div className="bento-card p-6">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted">
              {t.dashboard.kpiDrops}
              <TrendingDown className="w-4 h-4 text-rose-500" />
            </div>
            <div
              className={`text-4xl font-extrabold mt-3 ${
                flaggedDrops.length > 0 ? "text-rose-500" : "text-cyan-accent"
              }`}
            >
              {flaggedDrops.length}
            </div>
            <div className="text-xs font-semibold text-muted mt-1">
              {flaggedDrops.length > 0
                ? isHy
                  ? "պահանջում է ուշադրություն"
                  : "needs your attention"
                : isHy
                  ? "բոլոր միավորները կայուն են"
                  : "all scores are healthy"}
            </div>
          </div>

          <div className="bento-card p-6">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted">
              {t.dashboard.kpiIssues}
              <CheckCircle2 className="w-4 h-4 text-cyan-accent" />
            </div>
            <div className="text-4xl font-extrabold text-primary mt-3">
              {openIssues.length}
            </div>
            <div className="text-xs font-semibold text-muted mt-1">
              {overdueIssues.length > 0 ? (
                <span className="text-rose-500 font-bold">
                  {overdueIssues.length} {t.dashboard.kpiOverdue}
                </span>
              ) : isHy ? (
                "ուշացած խնդիր չկա"
              ) : (
                "none overdue"
              )}
            </div>
          </div>
        </div>

        {/* Focused "Needs Your Attention" Section (only if there are drops or overdue issues) */}
        {(flaggedDrops.length > 0 || overdueIssues.length > 0) && (
          <div className="bento-warn p-6 space-y-3">
            <div className="flex items-center gap-2.5 text-sm font-extrabold text-yellow-accent">
              <AlertTriangle className="w-4 h-4" />
              {isHy ? "Ուշադրության կարիք ունի" : "Needs Your Attention"}
            </div>

            <div className="space-y-2.5">
              {flaggedDrops.map((item, idx) => (
                <Link
                  key={`drop-${idx}`}
                  href={`/surveys/${item.surveyId}`}
                  className="flex items-center justify-between gap-3 bento-inner px-4 py-3.5 hover:border-[#ffe600] transition-colors"
                >
                  <div className="text-sm font-bold text-primary">
                    {item.groupName} — {item.drop.label}{" "}
                    <span className="text-rose-500 font-extrabold ml-1">
                      ({item.drop.previousScore.toFixed(1)} →{" "}
                      {item.drop.currentScore.toFixed(1)})
                    </span>
                  </div>
                  <span className="text-xs font-extrabold text-cyan-accent inline-flex items-center gap-1 shrink-0">
                    {isHy ? "Բացել" : "Inspect"} <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              ))}

              {overdueIssues.map((issue) => (
                <Link
                  key={issue.id}
                  href="/issues"
                  className="flex items-center justify-between gap-3 bento-inner px-4 py-3.5 hover:border-rose-500/60 transition-colors"
                >
                  <div className="text-sm font-bold text-primary flex items-center gap-2">
                    <Clock className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>
                      {issue.group.name}: {issue.title}
                    </span>
                  </div>
                  <span className="text-xs font-extrabold text-rose-500 shrink-0">
                    {t.dashboard.overdueTag} →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Active Surveys — Clean, Simple Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-primary">
              {t.dashboard.activeSurveys}
            </h2>
            <Link
              href="/surveys"
              className="text-xs font-extrabold text-cyan-accent hover:underline"
            >
              {t.dashboard.viewAll} →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {activeSurveys.map((s) => {
              const total = s.invites.length;
              const done = s.invites.filter((i) => i.respondedAt !== null).length;
              const rate = total > 0 ? Math.round((done / total) * 100) : 0;
              const targetMet = rate >= s.targetResponseRate;

              return (
                <Link
                  key={s.id}
                  href={`/surveys/${s.id}`}
                  className="bento-card p-5 hover:border-[#00f0d8] transition-all flex flex-col justify-between gap-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-extrabold text-primary">
                      {s.group.name}
                    </span>
                    <span
                      className={`text-xs font-extrabold ${
                        targetMet ? "text-cyan-accent" : "text-yellow-accent"
                      }`}
                    >
                      {rate}%
                    </span>
                  </div>

                  <div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          targetMet ? "bg-[#00e5cc]" : "bg-[#ffe600]"
                        }`}
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs font-semibold text-muted mt-2">
                      <span>
                        {done} / {total} {isHy ? "ուսանող" : "students"}
                      </span>
                      <span className="text-cyan-accent font-bold">
                        {isHy ? "Տեսնել →" : "Open →"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Clean Score Trend Chart */}
        <div className="bento-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-extrabold text-primary">
                {t.dashboard.trendTitle}
              </h2>
              <p className="text-xs font-medium text-muted">
                {t.dashboard.trendSub}
              </p>
            </div>
            {user.role !== "LECTURER" && (
              <Link
                href="/compare"
                className="text-xs font-extrabold text-cyan-accent hover:underline inline-flex items-center gap-1"
              >
                {t.dashboard.compareGroups} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
          <TrendLineChart data={trendData} lang={lang} />
        </div>
      </div>
    </AppShell>
  );
}
