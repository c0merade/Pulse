import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getGroupScopeWhere } from "@/lib/auth";
import { getServerLang } from "@/lib/i18n-server";
import { AppShell } from "@/components/AppShell";
import { IssuesClient } from "@/components/IssuesClient";

export const dynamic = "force-dynamic";

export default async function IssuesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const lang = await getServerLang();
  const aiMode = process.env.GEMINI_API_KEY?.trim() ? "GEMINI" : "FALLBACK";
  const groupScope = getGroupScopeWhere(user);

  const [issues, groups] = await Promise.all([
    prisma.issue.findMany({
      where: { group: groupScope },
      include: {
        group: { select: { id: true, name: true } },
        sourceSurvey: { select: { id: true, title: true } },
        verifiedBySurvey: { select: { id: true, title: true } },
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    }),
    prisma.group.findMany({
      where: { isArchived: false, ...groupScope },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serialized = issues.map((i) => ({
    id: i.id,
    title: i.title,
    description: i.description,
    category: i.category,
    severity: i.severity,
    status: i.status,
    ownerRole: i.ownerRole,
    ownerName: i.ownerName,
    dueDate: i.dueDate.toISOString(),
    group: i.group,
    sourceSurvey: i.sourceSurvey,
    verifiedBySurvey: i.verifiedBySurvey,
  }));

  return (
    <AppShell aiMode={aiMode} user={user} initialLang={lang}>
      <IssuesClient issues={serialized} groups={groups} lang={lang} />
    </AppShell>
  );
}
