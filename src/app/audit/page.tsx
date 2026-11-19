import { redirect } from "next/navigation";
import { Shield } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { DICT } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";
import { AppShell } from "@/components/AppShell";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "LECTURER") redirect("/");

  const lang = await getServerLang();
  const t = DICT[lang];
  const aiMode = process.env.GEMINI_API_KEY?.trim() ? "GEMINI" : "FALLBACK";

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <AppShell aiMode={aiMode} user={user} initialLang={lang}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            {t.audit.title}
          </h1>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-1">
            {t.audit.subtitle}
          </p>
        </div>

        <div className="bento-card overflow-hidden">
          {logs.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-400">
              {t.audit.empty}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.03] text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                    <th className="py-3.5 px-4">{t.audit.colTime}</th>
                    <th className="py-3.5 px-4">{t.audit.colActor}</th>
                    <th className="py-3.5 px-4">{t.audit.colAction}</th>
                    <th className="py-3.5 px-4">{t.audit.colDetails}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-white/[0.03]"
                    >
                      <td className="py-3 px-4 whitespace-nowrap text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-950 dark:text-white text-xs">
                          {log.actorName}
                        </div>
                        <div className="text-[11px] font-semibold text-teal-700 dark:text-[#ffe600]">
                          {log.actorRole}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#00e5cc]/15 text-teal-800 dark:text-[#00f0d8] text-xs font-extrabold">
                          <Shield className="w-3 h-3" />
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                        {log.details || `${log.entityType} ${log.entityId ?? ""}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
