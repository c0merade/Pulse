import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  computeAverages,
  computeDeltas,
  getFairnessStatus,
} from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";
import { DICT } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";
import { AppShell } from "@/components/AppShell";
import {
  ComparisonBarChart,
  GroupComparePoint,
} from "@/components/DashboardCharts";

export const dynamic = "force-dynamic";

export default async function ComparePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "LECTURER") redirect("/");

  const lang = await getServerLang();
  const t = DICT[lang];
  const aiMode = process.env.GEMINI_API_KEY?.trim() ? "GEMINI" : "FALLBACK";

  const groups = await prisma.group.findMany({
    where: { isArchived: false },
    include: {
      surveys: {
        include: {
          invites: { select: { respondedAt: true } },
          responses: true,
        },
        orderBy: { waveNumber: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const rows = groups.map((g) => {
    const latest = g.surveys[g.surveys.length - 1] ?? null;
    const prev = g.surveys.length >= 2 ? g.surveys[g.surveys.length - 2] : null;

    const latestAvg = latest ? computeAverages(latest.responses) : null;
    const prevAvg = prev ? computeAverages(prev.responses) : null;
    const deltas = latestAvg ? computeDeltas(latestAvg, prevAvg) : null;

    const totalInvites = latest?.invites.length ?? 0;
    const respondedCount =
      latest?.invites.filter((i) => i.respondedAt !== null).length ?? 0;
    const responseRate =
      totalInvites > 0 ? Math.round((respondedCount / totalInvites) * 100) : 0;

    const fairness = getFairnessStatus(respondedCount, responseRate);

    return {
      groupId: g.id,
      groupName: g.name,
      courseName: g.courseName,
      lecturerName: g.lecturerName,
      latestSurveyId: latest?.id ?? null,
      sampleSize: respondedCount,
      totalInvites,
      responseRate,
      fairness,
      averages: latestAvg,
      overallDelta: deltas?.overall ?? null,
    };
  });

  const chartData: GroupComparePoint[] = rows
    .filter((r) => r.averages && r.averages.count > 0)
    .map((r) => ({
      name: `${r.groupName}${r.fairness.reliable ? "" : " *"}`,
      lectures: r.averages!.lectures,
      practice: r.averages!.practice,
      materials: r.averages!.materials,
      organization: r.averages!.organization,
    }));

  return (
    <AppShell aiMode={aiMode} user={user} initialLang={lang}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            {t.compare.title}
          </h1>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-1">
            {t.compare.subtitle}
          </p>
        </div>

        {/* Fairness Guardrail Banner */}
        <div className="bento-card p-5 border-[#ffe600]/40 bg-amber-50/70 dark:bg-[#1c1b14] flex items-start gap-3">
          <span className="w-7 h-7 rounded-full bg-[#ffe600] text-slate-950 flex items-center justify-center shrink-0 mt-0.5">
            <Info className="w-4 h-4 stroke-[2.5]" />
          </span>
          <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
            <strong className="font-extrabold text-slate-950 dark:text-[#ffe600]">
              {t.compare.guardTitle}
            </strong>{" "}
            {t.compare.guardBody}
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bento-card p-6">
          <h2 className="text-lg font-extrabold text-slate-950 dark:text-white mb-1">
            {t.compare.chartTitle}
          </h2>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-4">
            {t.compare.chartSub}
          </p>
          <ComparisonBarChart data={chartData} lang={lang} />
        </div>

        {/* Detailed Comparison Table */}
        <div className="bento-card p-6">
          <h2 className="text-lg font-extrabold text-slate-950 dark:text-white mb-4">
            {t.compare.tableTitle}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/[0.08] text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
                  <th className="py-3 pr-3">{t.compare.colGroup}</th>
                  <th className="py-3 px-2">{t.compare.colSample}</th>
                  <th className="py-3 px-2">{t.categories.LECTURES}</th>
                  <th className="py-3 px-2">{t.categories.PRACTICE}</th>
                  <th className="py-3 px-2">{t.categories.MATERIALS}</th>
                  <th className="py-3 px-2">{t.categories.ORGANIZATION}</th>
                  <th className="py-3 px-2">{t.compare.colOverall}</th>
                  <th className="py-3 pl-2">{t.compare.colConfidence}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                {rows.map((r) => (
                  <tr
                    key={r.groupId}
                    className={
                      r.fairness.reliable
                        ? "hover:bg-slate-50/70 dark:hover:bg-white/[0.03]"
                        : "bg-amber-50/40 dark:bg-[#ffe600]/[0.04]"
                    }
                  >
                    <td className="py-3.5 pr-4">
                      <div className="font-extrabold text-slate-950 dark:text-white">
                        {r.latestSurveyId ? (
                          <Link
                            href={`/surveys/${r.latestSurveyId}`}
                            className="hover:text-teal-600 dark:hover:text-[#00f0d8]"
                          >
                            {r.groupName}
                          </Link>
                        ) : (
                          r.groupName
                        )}
                      </div>
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {r.lecturerName} · {r.courseName}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap text-xs font-bold text-slate-700 dark:text-slate-300">
                      n={r.sampleSize}/{r.totalInvites} ({r.responseRate}%)
                    </td>
                    <td className="py-3.5 px-3 font-bold">
                      {r.averages ? r.averages.lectures.toFixed(1) : "—"}
                    </td>
                    <td className="py-3.5 px-3 font-bold">
                      {r.averages ? r.averages.practice.toFixed(1) : "—"}
                    </td>
                    <td className="py-3.5 px-3 font-bold">
                      {r.averages ? r.averages.materials.toFixed(1) : "—"}
                    </td>
                    <td className="py-3.5 px-3 font-bold">
                      {r.averages ? r.averages.organization.toFixed(1) : "—"}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-950 dark:text-white">
                          {r.averages ? r.averages.overall.toFixed(2) : "—"}
                        </span>
                        {r.overallDelta !== null && (
                          <span
                            className={`inline-flex items-center gap-0.5 text-xs font-extrabold ${
                              r.overallDelta > 0
                                ? "text-teal-600 dark:text-[#00f0d8]"
                                : r.overallDelta < 0
                                  ? "text-rose-500"
                                  : "text-slate-400"
                            }`}
                          >
                            {r.overallDelta > 0 ? (
                              <TrendingUp className="w-3.5 h-3.5" />
                            ) : r.overallDelta < 0 ? (
                              <TrendingDown className="w-3.5 h-3.5" />
                            ) : null}
                            {r.overallDelta > 0
                              ? `+${r.overallDelta.toFixed(2)}`
                              : r.overallDelta.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 pl-3">
                      {r.fairness.reliable ? (
                        <span className="inline-flex items-center gap-1 text-xs font-extrabold text-teal-800 dark:text-[#00f0d8] bg-[#00e5cc]/20 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {t.compare.reliable}
                        </span>
                      ) : (
                        <span
                          title={r.fairness.reason}
                          className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-800 dark:text-[#ffe600] bg-[#ffe600]/25 px-2.5 py-0.5 rounded-full"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          {t.compare.lowSample}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
