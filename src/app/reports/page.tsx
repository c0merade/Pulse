import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { computeAverages, detectDrops, ThemeCluster } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { BriefData, MeetingBriefClient } from "@/components/MeetingBriefClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "LECTURER") redirect("/");

  const aiMode = process.env.GEMINI_API_KEY?.trim() ? "GEMINI" : "FALLBACK";

  const [groups, issues] = await Promise.all([
    prisma.group.findMany({
      where: { isArchived: false },
      include: {
        surveys: {
          include: {
            invites: { select: { respondedAt: true } },
            responses: true,
            analysis: true,
          },
          orderBy: { waveNumber: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.issue.findMany({
      include: { group: { select: { name: true } } },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    }),
  ]);

  const now = new Date();
  const activeSurveys = groups.flatMap((g) =>
    g.surveys.filter((s) => s.status === "ACTIVE")
  );
  const rates = activeSurveys.map((s) => {
    const total = s.invites.length;
    const done = s.invites.filter((i) => i.respondedAt !== null).length;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  });
  const avgTurnout =
    rates.length > 0
      ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length)
      : 0;

  const drops: BriefData["drops"] = [];
  const latestSummaries: BriefData["latestSummaries"] = [];

  for (const g of groups) {
    const latest = g.surveys[g.surveys.length - 1];
    if (!latest) continue;
    const prev = g.surveys.length >= 2 ? g.surveys[g.surveys.length - 2] : null;
    const avg = computeAverages(latest.responses);
    const prevAvg = prev ? computeAverages(prev.responses) : null;

    for (const d of detectDrops(avg, prevAvg)) {
      drops.push({
        groupName: g.name,
        surveyTitle: latest.title,
        dimension: d.label,
        previousScore: d.previousScore,
        currentScore: d.currentScore,
        delta: d.delta,
      });
    }

    const total = latest.invites.length;
    const done = latest.invites.filter((i) => i.respondedAt !== null).length;
    const rate = total > 0 ? Math.round((done / total) * 100) : 0;

    const themes: ThemeCluster[] = latest.analysis?.themesJson
      ? JSON.parse(latest.analysis.themesJson)
      : [];

    latestSummaries.push({
      groupName: g.name,
      lecturerName: g.lecturerName,
      surveyTitle: latest.title,
      responseRate: rate,
      sampleSize: done,
      overallScore: avg.overall,
      summary:
        latest.analysis?.overallSummary ||
        "AI summary not yet generated for this wave.",
      topNegativeThemes: themes
        .filter((t) => t.sentiment === "NEGATIVE")
        .slice(0, 3)
        .map((t) => ({ theme: t.theme, count: t.count })),
    });
  }

  const openIssues = issues.filter(
    (i) => i.status === "OPEN" || i.status === "IN_PROGRESS"
  );
  const overdueIssues = openIssues.filter((i) => new Date(i.dueDate) < now);
  const verifiedIssues = issues.filter((i) => i.status === "VERIFIED");

  const briefData: BriefData = {
    generatedAt: now.toISOString(),
    stats: {
      activeSurveys: activeSurveys.length,
      avgTurnout,
      flaggedDrops: drops.length,
      openIssues: openIssues.length,
      overdueIssues: overdueIssues.length,
      verifiedIssues: verifiedIssues.length,
    },
    drops,
    latestSummaries,
    issues: issues.map((i) => ({
      id: i.id,
      title: i.title,
      groupName: i.group.name,
      category: i.category,
      severity: i.severity,
      status: i.status,
      ownerRole: i.ownerRole,
      ownerName: i.ownerName,
      dueDate: i.dueDate.toISOString(),
      isOverdue:
        (i.status === "OPEN" || i.status === "IN_PROGRESS") &&
        new Date(i.dueDate) < now,
    })),
  };

  return (
    <AppShell aiMode={aiMode} user={user}>
      <MeetingBriefClient data={briefData} />
    </AppShell>
  );
}
