import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getServerLang } from "@/lib/i18n-server";
import { AppShell } from "@/components/AppShell";
import { GroupsClient } from "@/components/GroupsClient";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "LECTURER") redirect("/");

  const lang = await getServerLang();
  const aiMode = process.env.GEMINI_API_KEY?.trim() ? "GEMINI" : "FALLBACK";
  const syncConfigured = Boolean(process.env.PLATFORM_API_KEY?.trim());

  const groups = await prisma.group.findMany({
    include: {
      students: { orderBy: { name: "asc" } },
      _count: { select: { surveys: true, issues: true } },
    },
    orderBy: [{ isArchived: "asc" }, { name: "asc" }],
  });

  const serialized = groups.map((g) => ({
    id: g.id,
    name: g.name,
    courseName: g.courseName,
    lecturerName: g.lecturerName,
    lecturerEmail: g.lecturerEmail,
    isArchived: g.isArchived,
    students: g.students.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
    })),
    surveysCount: g._count.surveys,
    issuesCount: g._count.issues,
  }));

  return (
    <AppShell aiMode={aiMode} user={user} initialLang={lang}>
      <GroupsClient groups={serialized} syncConfigured={syncConfigured} lang={lang} />
    </AppShell>
  );
}
