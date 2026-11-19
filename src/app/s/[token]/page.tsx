import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StudentSurveyForm } from "@/components/StudentSurveyForm";

export const dynamic = "force-dynamic";

export default async function StudentSurveyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const invite = await prisma.surveyInvite.findUnique({
    where: { token },
    include: {
      student: { select: { name: true } },
      survey: {
        include: {
          group: { select: { name: true, courseName: true, lecturerName: true } },
        },
      },
    },
  });

  if (!invite) {
    notFound();
  }

  return (
    <StudentSurveyForm
      token={token}
      studentName={invite.student.name}
      alreadyResponded={invite.respondedAt !== null}
      survey={{
        title: invite.survey.title,
        status: invite.survey.status,
        groupName: invite.survey.group.name,
        courseName: invite.survey.group.courseName,
        lecturerName: invite.survey.group.lecturerName,
      }}
    />
  );
}
