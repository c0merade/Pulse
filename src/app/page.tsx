import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { computeAverages, computeDeltas, detectDrops } from "@/lib/analytics";
import { getCurrentUser, getGroupScopeWhere } from "@/lib/auth";
import { getServerLang } from "@/lib/i18n-server";
import { AppShell } from "@/components/AppShell";
import {
  InboxCohortItem,
  InboxWorkspaceClient,
} from "@/components/InboxWorkspaceClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const lang = await getServerLang();
  const aiMode = process.env.GEMINI_API_KEY?.trim() ? "GEMINI" : "FALLBACK";
  const groupScope = getGroupScopeWhere(user);

  const groups = await prisma.group.findMany({
    where: { isArchived: false, ...groupScope },
    include: {
      surveys: {
        include: {
          invites: { select: { token: true, respondedAt: true } },
          responses: true,
          analysis: true,
        },
        orderBy: { waveNumber: "asc" },
      },
      issues: {
        orderBy: [{ status: "asc" }, { dueDate: "asc" }],
      },
    },
    orderBy: { name: "asc" },
  });

  const now = new Date();

  const cohorts: InboxCohortItem[] = groups.map((g) => {
    const latest = g.surveys[g.surveys.length - 1] ?? null;
    const prev = g.surveys.length >= 2 ? g.surveys[g.surveys.length - 2] : null;

    let latestSurvey: InboxCohortItem["latestSurvey"] = null;
    if (latest) {
      const avg = computeAverages(latest.responses);
      const prevAvg = prev ? computeAverages(prev.responses) : null;
      const deltas = computeDeltas(avg, prevAvg);
      const drops = detectDrops(avg, prevAvg);
      const totalInvites = latest.invites.length;
      const respondedCount = latest.invites.filter(
        (i) => i.respondedAt !== null
      ).length;
      const responseRate =
        totalInvites > 0 ? Math.round((respondedCount / totalInvites) * 100) : 0;
      const pending = latest.invites.find((i) => i.respondedAt === null);

      latestSurvey = {
        id: latest.id,
        title: latest.title,
        waveNumber: latest.waveNumber,
        status: latest.status,
        targetResponseRate: latest.targetResponseRate,
        totalInvites,
        respondedCount,
        responseRate,
        averages: avg,
        deltas,
        drops,
        analysis: latest.analysis
          ? {
              overallSummary: latest.analysis.overallSummary,
              themes: JSON.parse(latest.analysis.themesJson),
              source: latest.analysis.source,
            }
          : null,
        samplePendingToken: pending?.token ?? null,
      };
    }

    return {
      groupId: g.id,
      groupName: g.name,
      courseName: g.courseName,
      lecturerName: g.lecturerName,
      latestSurvey,
      issues: g.issues.map((i) => ({
        id: i.id,
        title: i.title,
        category: i.category,
        status: i.status,
        ownerName: i.ownerName,
        dueDate: i.dueDate.toISOString(),
        isOverdue:
          (i.status === "OPEN" || i.status === "IN_PROGRESS") &&
          new Date(i.dueDate) < now,
      })),
    };
  });

  // Sort cohorts with drops or overdue issues to the top of the Inbox!
  cohorts.sort((a, b) => {
    const aUrgent =
      (a.latestSurvey?.drops.length ?? 0) > 0 ||
      a.issues.some((i) => i.isOverdue)
        ? 1
        : 0;
    const bUrgent =
      (b.latestSurvey?.drops.length ?? 0) > 0 ||
      b.issues.some((i) => i.isOverdue)
        ? 1
        : 0;
    return bUrgent - aUrgent;
  });

  return (
    <AppShell aiMode={aiMode} user={user} initialLang={lang}>
      <InboxWorkspaceClient
        cohorts={cohorts}
        lang={lang}
        canManage={user.role !== "LECTURER"}
        userName={user.name}
      />
    </AppShell>
  );
}
