"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { submitRelationFeedback, type RelationFeedback } from "@/lib/relations/queries";

// Sits inside the /movies/[id] #related card, which is itself a <Link> to
// the related content — every handler stops propagation/prevents default so
// tapping 확인/아니에요 votes instead of navigating away.
export default function RelationFeedbackButtons({ relationId }: { relationId: string }) {
  const [choice, setChoice] = useState<RelationFeedback | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleFeedback(e: React.MouseEvent, feedback: RelationFeedback) {
    e.preventDefault();
    e.stopPropagation();
    if (submitting) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    setSubmitting(true);
    setNotice(null);
    const result = await submitRelationFeedback(supabase, relationId, feedback);
    setSubmitting(false);

    if (result.error === "not_authenticated") {
      setNotice("로그인이 필요해요");
      return;
    }
    if (result.success) {
      setChoice(feedback);
      setNotice("의견 감사해요");
    } else {
      setNotice("처리에 실패했어요");
    }
  }

  return (
    <div className="rel-feedback" onClick={(e) => e.preventDefault()}>
      <div style={{ display: "flex", gap: 10 }}>
        <span
          className={choice === "CONFIRM" ? "active" : undefined}
          onClick={(e) => handleFeedback(e, "CONFIRM")}
        >
          확인
        </span>
        <span
          className={choice === "REJECT" ? "active" : undefined}
          onClick={(e) => handleFeedback(e, "REJECT")}
        >
          아니에요
        </span>
      </div>
      {notice && <span className="rel-feedback-notice">{notice}</span>}
    </div>
  );
}
