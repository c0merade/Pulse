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
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/surveys"
          className="inline-flex items-center gap-2 py-2.5 px-5 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {isHy ? "Նոր հարցում" : "New Survey"}
        </Link>

        {canManage && (
          <button
            type="button"
            onClick={handleQuickRemind}
            disabled={sending}
            className="inline-flex items-center gap-2 py-2.5 px-5 rounded-full bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] text-primary text-sm font-semibold transition-all disabled:opacity-60 cursor-pointer"
          >
            <Bell className="w-4 h-4 text-[var(--accent-text)]" />
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
            className="inline-flex items-center gap-2 py-2.5 px-5 rounded-full bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] text-primary text-sm font-semibold transition-all"
          >
            <FileText className="w-4 h-4 text-muted" />
            {isHy ? "Ժողովի ամփոփագիր" : "Meeting Brief"}
          </Link>
        )}
      </div>

      {notice && (
        <div className="bento-card px-4 py-3 text-sm font-medium text-primary flex items-center justify-between gap-2">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-muted hover:text-primary cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
