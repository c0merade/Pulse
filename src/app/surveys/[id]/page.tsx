import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { computeAverages, computeDeltas, detectDrops } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { SurveyDetailClient } from "@/components/SurveyDetailClient";

export const dynamic = "force-dynamic";

export default async function SurveyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const aiMode = process.env.GEMINI_API_KEY?.trim() ? "GEMINI" : "FALLBACK";

  const survey = await prisma.survey.findUnique({
    where: { id },
    include: {
      group: true,
      invites: {
        include: { student: true },
        orderBy: { student: { name: "asc" } },
      },
      responses: {
        orderBy: { submittedAt: "desc" },
      },
      analysis: true,
      reminderLogs: {
        orderBy: { sentAt: "desc" },
        take: 25,
      },
    },
  });

  if (!survey) {
    notFound();
  }

  if (user.role === "LECTURER" && survey.group.lecturerEmail !== user.email) {
    redirect("/");
  }

  const prevSurvey = await prisma.survey.findFirst({
    where: {
      groupId: survey.groupId,
      waveNumber: { lt: survey.waveNumber },
    },
    orderBy: { waveNumber: "desc" },
    include: { responses: true },
  });

  const groupIssues = await prisma.issue.findMany({
    where: { groupId: survey.groupId },
    orderBy: { createdAt: "desc" },
  });

  const averages = computeAverages(survey.responses);
  const prevAverages = prevSurvey ? computeAverages(prevSurvey.responses) : null;
  const deltas = computeDeltas(averages, prevAverages);
  const drops = detectDrops(averages, prevAverages);

  const totalInvites = survey.invites.length;
  const respondedCount = survey.invites.filter((i) => i.respondedAt !== null).length;
  const responseRate =
    totalInvites > 0 ? Math.round((respondedCount / totalInvites) * 100) : 0;

  return (
    <AppShell aiMode={aiMode} user={user}>
      <SurveyDetailClient
        survey={{
          id: survey.id,
          title: survey.title,
          waveNumber: survey.waveNumber,
          status: survey.status,
          targetResponseRate: survey.targetResponseRate,
          closesAt: survey.closesAt.toISOString(),
          group: {
            id: survey.group.id,
            name: survey.group.name,
            courseName: survey.group.courseName,
            lecturerName: survey.group.lecturerName,
          },
          totalInvites,
          respondedCount,
          responseRate,
          averages,
          previousSurvey:
            prevSurvey && prevAverages
              ? {
                  id: prevSurvey.id,
                  title: prevSurvey.title,
                  waveNumber: prevSurvey.waveNumber,
                  averages: prevAverages,
                }
              : null,
          deltas,
          drops,
          analysis: survey.analysis
            ? {
                overallSummary: survey.analysis.overallSummary,
                themes: JSON.parse(survey.analysis.themesJson),
                source: survey.analysis.source,
                analyzedAt: survey.analysis.analyzedAt.toISOString(),
              }
            : null,
          invites: survey.invites.map((i) => ({
            id: i.id,
            token: i.token,
            studentName: i.student.name,
            studentEmail: i.student.email,
            respondedAt: i.respondedAt ? i.respondedAt.toISOString() : null,
            remindersSent: i.remindersSent,
          })),
          responses: survey.responses.map((r) => ({
            id: r.id,
            lecturesScore: r.lecturesScore,
            practiceScore: r.practiceScore,
            materialsScore: r.materialsScore,
            organizationScore: r.organizationScore,
            comment: r.comment,
            submittedAt: r.submittedAt.toISOString(),
          })),
          reminderLogs: survey.reminderLogs.map((l) => ({
            id: l.id,
            studentName: l.studentName,
            studentEmail: l.studentEmail,
            message: l.message,
            sentAt: l.sentAt.toISOString(),
          })),
          groupIssues: groupIssues.map((i) => ({
            id: i.id,
            title: i.title,
            category: i.category,
            status: i.status,
            ownerName: i.ownerName,
            dueDate: i.dueDate.toISOString(),
            sourceSurveyId: i.sourceSurveyId,
            verifiedBySurveyId: i.verifiedBySurveyId,
          })),
        }}
      />
    </AppShell>
  );
}
