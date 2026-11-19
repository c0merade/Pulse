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
      latestSurveyTitle: latest?.title ?? "No survey",
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
    <AppShell aiMode={aiMode} user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Fair Group &amp; Lecturer Comparison
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Compare latest wave scores carefully alongside sample size, turnout rate, and wave-over-wave momentum.
          </p>
        </div>

        {/* Fairness Guardrail Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <strong className="font-semibold">Fairness Guardrails Active:</strong>{" "}
            Groups or lecturers with fewer than <strong>5 responses</strong> or under{" "}
            <strong>50% turnout</strong> are flagged as <em>Low Sample</em> (marked with{" "}
            <code>*</code>). Always read scores together with sample size and trend direction rather than raw rankings.
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <h2 className="text-base font-semibold text-slate-900 mb-1">
            Latest Wave Scores by Group
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Four quality dimensions (1–5 scale). Asterisk (*) indicates low-confidence sample.
          </p>
          <ComparisonBarChart data={chartData} />
        </div>

        {/* Detailed Comparison Table */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <h2 className="text-base font-semibold text-slate-900 mb-4">
            Group &amp; Lecturer Breakdown
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <th className="py-2.5 pr-4 font-medium">Group &amp; Lecturer</th>
                  <th className="py-2.5 px-3 font-medium">Sample</th>
                  <th className="py-2.5 px-3 font-medium">Lectures</th>
                  <th className="py-2.5 px-3 font-medium">Practice</th>
                  <th className="py-2.5 px-3 font-medium">Materials</th>
                  <th className="py-2.5 px-3 font-medium">Org</th>
                  <th className="py-2.5 px-3 font-medium">Overall / Trend</th>
                  <th className="py-2.5 pl-3 font-medium">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr
                    key={r.groupId}
                    className={
                      r.fairness.reliable ? "hover:bg-slate-50/70" : "bg-amber-50/30"
                    }
                  >
                    <td className="py-3.5 pr-4">
                      <div className="font-semibold text-slate-900">
                        {r.latestSurveyId ? (
                          <Link
                            href={`/surveys/${r.latestSurveyId}`}
                            className="hover:text-indigo-600"
                          >
                            {r.groupName}
                          </Link>
                        ) : (
                          r.groupName
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {r.lecturerName} · {r.courseName}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap text-xs text-slate-600">
                      <strong>n={r.sampleSize}</strong>/{r.totalInvites} ({r.responseRate}%)
                    </td>
                    <td className="py-3.5 px-3 font-medium">
                      {r.averages ? r.averages.lectures.toFixed(1) : "—"}
                    </td>
                    <td className="py-3.5 px-3 font-medium">
                      {r.averages ? r.averages.practice.toFixed(1) : "—"}
                    </td>
                    <td className="py-3.5 px-3 font-medium">
                      {r.averages ? r.averages.materials.toFixed(1) : "—"}
                    </td>
                    <td className="py-3.5 px-3 font-medium">
                      {r.averages ? r.averages.organization.toFixed(1) : "—"}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">
                          {r.averages ? r.averages.overall.toFixed(2) : "—"}
                        </span>
                        {r.overallDelta !== null && (
                          <span
                            className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                              r.overallDelta > 0
                                ? "text-emerald-600"
                                : r.overallDelta < 0
                                  ? "text-rose-600"
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
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Reliable
                        </span>
                      ) : (
                        <span
                          title={r.fairness.reason}
                          className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          {r.fairness.label}
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
