"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { reportTarget, type ReportTargetType } from "@/lib/community/queries";

export default function ReportButton({ targetType, targetId }: { targetType: ReportTargetType; targetId: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleReport() {
    if (done) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setSubmitting(true);
    const result = await reportTarget(supabase, targetType, targetId);
    setSubmitting(false);

    if (result.error === "not_authenticated") {
      setNotice("로그인이 필요해요.");
      return;
    }
    if (result.success) {
      setDone(true);
      setNotice("신고 접수됐어요.");
    } else {
      setNotice("신고 접수에 실패했어요.");
    }
  }

  return (
    <span
      style={{ cursor: done ? "default" : "pointer", opacity: submitting ? 0.6 : 1 }}
      onClick={handleReport}
      title={notice ?? undefined}
    >
      {notice ?? "신고"}
    </span>
  );
}
