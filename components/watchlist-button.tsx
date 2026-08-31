"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { isInWatchlist, toggleWatchlist } from "@/lib/collections/queries";

export default function WatchlistButton({ contentId }: { contentId: string }) {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [active, setActive] = useState(false);
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

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      setLoggedIn(Boolean(user));

      if (user) {
        const inWatchlist = await isInWatchlist(supabase, contentId);
        if (!cancelled) setActive(inWatchlist);
      }

      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [contentId]);

  async function handleClick() {
    const supabase = getSupabaseClient();
    if (!supabase || !loggedIn) {
      setNotice("로그인이 필요해요.");
      return;
    }

    setSubmitting(true);
    setNotice(null);
    const result = await toggleWatchlist(supabase, contentId);
    setSubmitting(false);

    if (result.success) {
      setActive(result.active);
    } else {
      setNotice("처리에 실패했어요. 잠시 후 다시 시도해주세요.");
    }
  }

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      <button
        type="button"
        className={`btn ${active ? "ghost" : "orange"}`}
        disabled={!ready || submitting}
        onClick={handleClick}
      >
        {active ? "✓ 보고 싶어요" : "보고 싶어요"}
      </button>
      {notice && (
        <span className="muted" style={{ fontSize: 12 }}>
          {notice}
        </span>
      )}
    </div>
  );
}
