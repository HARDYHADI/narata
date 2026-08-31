"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { isPostLiked, togglePostLike } from "@/lib/community/queries";

export default function LikeButton({ postId, initialLikeCount }: { postId: string; initialLikeCount: number }) {
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(false);
  const [count, setCount] = useState(initialLikeCount);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setReady(true);
        return;
      }
      const liked = await isPostLiked(supabase, postId);
      if (!cancelled) setActive(liked);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  async function handleClick() {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setSubmitting(true);
    setNotice(null);
    const result = await togglePostLike(supabase, postId);
    setSubmitting(false);

    if (result.error === "not_authenticated") {
      setNotice("로그인이 필요해요.");
      return;
    }
    if (!result.success) return;

    setActive(result.active);
    setCount((c) => c + (result.active ? 1 : -1));
  }

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      <button type="button" className={`btn ${active ? "orange" : "ghost"}`} disabled={!ready || submitting} onClick={handleClick}>
        {active ? "★" : "☆"} 추천 {count}
      </button>
      {notice && (
        <span className="muted" style={{ fontSize: 12 }}>
          {notice}
        </span>
      )}
    </div>
  );
}
