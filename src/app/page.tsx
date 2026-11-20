import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowRight, Clock } from "lucide-react";
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
  const verifiedIssues = issues.filter((i) => i.status === "VERIFIED");
  const firstName = user.name.split(" ")[0];

  const steps = isHy
    ? [
        { num: "01", title: "Հարցում", desc: "Ավտոմատ հիշեցումներ" },
        { num: "02", title: "AI Ամփոփում", desc: "Թեմաներ և անկումներ" },
        { num: "03", title: "Խնդիր", desc: "Պատասխանատու + ժամկետ" },
        { num: "04", title: "Հաստատում", desc: "Ստուգում հաջորդ ալիքում" },
      ]
    : [
        { num: "01", title: "Survey", desc: "Smart auto-reminders" },
        { num: "02", title: "AI Summary", desc: "Themes & score drops" },
        { num: "03", title: "Issue", desc: "Owner & due date" },
        { num: "04", title: "Verified", desc: "Confirmed next wave" },
      ];

  return (
    <AppShell aiMode={aiMode} user={user} initialLang={lang}>
      <div className="space-y-10">
        {/* Editorial Hero Header */}
        <section className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-text)]">
              Picsart Academy · Pulse
            </p>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-primary">
              {isHy ? `Բարի գալուստ, ${firstName}` : `Good day, ${firstName}`}
            </h1>
            <p className="text-base text-muted max-w-2xl leading-relaxed">
              {isHy
                ? "Ակադեմիայի ուսումնական որակի ամբողջ պատկերը՝ մեկ հանգիստ, ընթեռնելի էջում։"
                : "Your Academy quality pulse in one calm, focused editorial overview."}
            </p>
          </div>

          <QuickActionsBar lang={lang} canManage={user.role !== "LECTURER"} />
        </section>

        {/* Big Airy Editorial Metrics */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bento-card p-7 space-y-2">
            <div className="text-xs font-semibold text-muted">
              {t.dashboard.kpiTurnout}
            </div>
            <div className="text-5xl font-bold tracking-tight text-primary">
              {avgResponseRate}%
            </div>
            <div className="text-xs text-muted">
              {activeSurveys.length}{" "}
              {isHy ? "ակտիվ հարցում այս պահին" : "active surveys right now"}
            </div>
          </div>

          <div className="bento-card p-7 space-y-2">
            <div className="text-xs font-semibold text-muted">
              {t.dashboard.kpiDrops}
            </div>
            <div
              className={`text-5xl font-bold tracking-tight ${
                flaggedDrops.length > 0 ? "text-rose-600" : "text-emerald-600"
              }`}
            >
              {flaggedDrops.length}
            </div>
            <div className="text-xs text-muted">
              {flaggedDrops.length > 0
                ? isHy
                  ? "պահանջում է ուշադրություն"
                  : "requires review"
                : isHy
                  ? "բոլոր միավորները կայուն են"
                  : "all scores healthy"}
            </div>
          </div>

          <div className="bento-card p-7 space-y-2">
            <div className="text-xs font-semibold text-muted">
              {t.dashboard.kpiIssues}
            </div>
            <div className="text-5xl font-bold tracking-tight text-primary">
              {openIssues.length}
            </div>
            <div className="text-xs text-muted">
              {overdueIssues.length > 0 ? (
                <span className="text-rose-600 font-semibold">
                  {overdueIssues.length} {t.dashboard.kpiOverdue}
                </span>
              ) : (
                <span className="text-emerald-600 font-semibold">
                  {verifiedIssues.length} {t.dashboard.kpiVerified}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Needs Attention (Clean Editorial Callout) */}
        {(flaggedDrops.length > 0 || overdueIssues.length > 0) && (
          <section className="bento-warn p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4" />
              {isHy ? "Ուշադրության կարիք ունի" : "Needs Your Attention"}
            </div>

            <div className="space-y-2.5">
              {flaggedDrops.map((item, idx) => (
                <Link
                  key={`drop-${idx}`}
                  href={`/surveys/${item.surveyId}`}
                  className="flex items-center justify-between gap-3 bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-5 py-4 hover:border-[var(--accent)] transition-colors"
                >
                  <div className="text-sm font-semibold text-primary">
                    {item.groupName} — {item.drop.label}
                    <span className="text-rose-600 font-bold ml-2">
                      {item.drop.previousScore.toFixed(1)} →{" "}
                      {item.drop.currentScore.toFixed(1)}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-[var(--accent-text)] inline-flex items-center gap-1 shrink-0">
                    {isHy ? "Դիտել" : "Review"} <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              ))}

              {overdueIssues.map((issue) => (
                <Link
                  key={issue.id}
                  href="/issues"
                  className="flex items-center justify-between gap-3 bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-5 py-4 hover:border-rose-400 transition-colors"
                >
                  <div className="text-sm font-semibold text-primary flex items-center gap-2">
                    <Clock className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      {issue.group.name}: {issue.title}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-rose-600 shrink-0">
                    {t.dashboard.overdueTag} →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Active Surveys — Minimalist Cards */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-bold tracking-tight text-primary">
              {t.dashboard.activeSurveys}
            </h2>
            <Link
              href="/surveys"
              className="text-xs font-semibold text-[var(--accent-text)] hover:underline"
            >
              {t.dashboard.viewAll} →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {activeSurveys.map((s) => {
              const total = s.invites.length;
              const done = s.invites.filter((i) => i.respondedAt !== null).length;
              const rate = total > 0 ? Math.round((done / total) * 100) : 0;
              const targetMet = rate >= s.targetResponseRate;

              return (
                <Link
                  key={s.id}
                  href={`/surveys/${s.id}`}
                  className="bento-card p-6 hover:border-[var(--accent)] transition-all flex flex-col justify-between gap-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-primary">
                      {s.group.name}
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        targetMet ? "text-emerald-600" : "text-amber-600"
                      }`}
                    >
                      {rate}%
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="w-full h-1.5 bg-[var(--surface-elevated)] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          targetMet ? "bg-emerald-500" : "bg-[var(--accent)]"
                        }`}
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted">
                      <span>
                        {done} / {total} {isHy ? "ուսանող" : "students"}
                      </span>
                      <span className="font-semibold text-primary">
                        {isHy ? "Բացել →" : "Open →"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Trend Chart */}
        <section className="bento-card p-7 space-y-5">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-primary">
                {t.dashboard.trendTitle}
              </h2>
              <p className="text-xs text-muted mt-0.5">{t.dashboard.trendSub}</p>
            </div>
            {user.role !== "LECTURER" && (
              <Link
                href="/compare"
                className="text-xs font-semibold text-[var(--accent-text)] hover:underline inline-flex items-center gap-1"
              >
                {t.dashboard.compareGroups} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
          <TrendLineChart data={trendData} lang={lang} />
        </section>

        {/* Editorial 4-Step Workflow Strip */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          {steps.map((st) => (
            <div
              key={st.num}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/70 p-4 space-y-1"
            >
              <div className="text-[11px] font-bold text-[var(--accent-text)]">
                {st.num}
              </div>
              <div className="text-sm font-bold text-primary">{st.title}</div>
              <div className="text-xs text-muted">{st.desc}</div>
            </div>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
