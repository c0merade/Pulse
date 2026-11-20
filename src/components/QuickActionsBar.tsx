"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, FileText, Plus, X } from "lucide-react";
import type { Lang } from "@/lib/i18n";

export function QuickActionsBar({
  lang = "hy",
  canManage = true,
}: {
  lang?: Lang;
  canManage?: boolean;
}) {
  const router = useRouter();
  const isHy = lang === "hy";
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleQuickRemind() {
    setSending(true);
    setNotice(null);
    try {
      const res = await fetch("/api/reminders/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const data = await res.json();
      if (res.ok && data.summary) {
        setNotice(
          isHy
            ? `Պատրաստ է․ ուղարկվեց ${data.summary.remindersSent} հիշեցում չպատասխանած ուսանողներին։`
            : `Done: sent ${data.summary.remindersSent} reminder(s) to pending students.`
        );
        router.refresh();
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/surveys"
          className="flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-2xl bg-[#e000df] hover:bg-[#c400c3] text-white text-sm font-extrabold transition-all shadow-[0_0_20px_rgba(224,0,223,0.3)]"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          {isHy ? "Նոր հարցում սկսել" : "Start New Survey"}
        </Link>

        {canManage && (
          <button
            type="button"
            onClick={handleQuickRemind}
            disabled={sending}
            className="flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-2xl bg-[#ffe600] hover:bg-[#f5d800] text-slate-950 text-sm font-extrabold transition-all disabled:opacity-60 cursor-pointer"
          >
            <Bell className="w-4 h-4 stroke-[2.5]" />
            {sending
              ? isHy
                ? "Ուղարկվում է..."
                : "Sending..."
              : isHy
                ? "Հիշեցնել ուսանողներին"
                : "Remind Students"}
          </button>
        )}

        {canManage && (
          <Link
            href="/reports"
            className="flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-2xl bento-card hover:border-[#00f0d8] text-primary text-sm font-extrabold transition-all"
          >
            <FileText className="w-4 h-4 text-cyan-accent" />
            {isHy ? "Ժողովի ամփոփագիր" : "Meeting Brief"}
          </Link>
        )}
      </div>

      {notice && (
        <div className="bento-inner border-[#00e5cc]/50 px-4 py-3 text-sm font-bold text-cyan-accent flex items-center justify-between gap-2">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
