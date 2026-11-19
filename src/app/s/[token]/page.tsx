import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CustomQuestion, LANG_COOKIE_NAME, normalizeLang } from "@/lib/i18n";
import { StudentSurveyForm } from "@/components/StudentSurveyForm";

export const dynamic = "force-dynamic";

export default async function StudentSurveyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const cookieStore = await cookies();
  const initialLang = normalizeLang(cookieStore.get(LANG_COOKIE_NAME)?.value);

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

  let customQuestions: CustomQuestion[] = [];
  try {
    customQuestions = JSON.parse(invite.survey.customQuestionsJson || "[]");
  } catch {
    customQuestions = [];
  }

  return (
    <StudentSurveyForm
      token={token}
      studentName={invite.student.name}
      alreadyResponded={invite.respondedAt !== null}
      initialLang={initialLang}
      survey={{
        title: invite.survey.title,
        status: invite.survey.status,
        groupName: invite.survey.group.name,
        courseName: invite.survey.group.courseName,
        lecturerName: invite.survey.group.lecturerName,
        customQuestions,
      }}
    />
  );
}
