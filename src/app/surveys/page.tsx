import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { computeAverages, DropFlag } from "@/lib/analytics";
import { getCurrentUser, getGroupScopeWhere } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { SurveysClient } from "@/components/SurveysClient";

export const dynamic = "force-dynamic";

export default async function SurveysPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const aiMode = process.env.GEMINI_API_KEY?.trim() ? "GEMINI" : "FALLBACK";
  const groupScope = getGroupScopeWhere(user);

  const [surveys, groups] = await Promise.all([
    prisma.survey.findMany({
      where: { group: groupScope },
      include: {
        group: true,
        invites: { select: { token: true, respondedAt: true } },
        responses: true,
        analysis: true,
      },
      orderBy: [{ status: "asc" }, { scheduledAt: "desc" }],
    }),
    prisma.group.findMany({
      where: { isArchived: false, ...groupScope },
      orderBy: { name: "asc" },
    }),
  ]);

  const serializedSurveys = surveys.map((s) => {
    const totalInvites = s.invites.length;
    const respondedCount = s.invites.filter((i) => i.respondedAt !== null).length;
    const responseRate =
      totalInvites > 0 ? Math.round((respondedCount / totalInvites) * 100) : 0;
    const avg = computeAverages(s.responses);
    const drops: DropFlag[] = s.analysis?.dropsFlaggedJson
      ? JSON.parse(s.analysis.dropsFlaggedJson)
      : [];
    const pendingInvite = s.invites.find((i) => i.respondedAt === null);

    return {
      id: s.id,
      title: s.title,
      waveNumber: s.waveNumber,
      status: s.status,
      scheduledAt: s.scheduledAt.toISOString(),
      closesAt: s.closesAt.toISOString(),
      targetResponseRate: s.targetResponseRate,
      reminderIntervalHours: s.reminderIntervalHours,
      group: {
        id: s.group.id,
        name: s.group.name,
        courseName: s.group.courseName,
        lecturerName: s.group.lecturerName,
      },
      totalInvites,
      respondedCount,
      responseRate,
      overallScore: avg.overall,
      hasAnalysis: Boolean(s.analysis),
      dropsCount: drops.length,
      samplePendingToken: pendingInvite?.token ?? null,
    };
  });

  const serializedGroups = groups.map((g) => ({
    id: g.id,
    name: g.name,
    courseName: g.courseName,
    lecturerName: g.lecturerName,
  }));

  return (
    <AppShell aiMode={aiMode} user={user}>
      <SurveysClient surveys={serializedSurveys} groups={serializedGroups} />
    </AppShell>
  );
}
