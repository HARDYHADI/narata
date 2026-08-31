"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchMyRating, submitRating } from "@/lib/reviews/queries";

export function useMyRating(contentId: string) {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [myScore, setMyScore] = useState<number | null>(null);
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
        const rating = await fetchMyRating(supabase, contentId);
        if (!cancelled) setMyScore(rating?.score ?? null);
      }

      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [contentId]);

  const requireLoginNotice = useCallback(() => {
    setNotice("로그인이 필요해요.");
  }, []);

  const rate = useCallback(
    async (score: number) => {
      const supabase = getSupabaseClient();
      if (!supabase || !loggedIn) {
        requireLoginNotice();
        return false;
      }

      setSubmitting(true);
      setNotice(null);
      const result = await submitRating(supabase, contentId, score);
      setSubmitting(false);

      if (result.success) {
        setMyScore(result.rating?.score ?? score);
        setNotice("평점을 남겼어요.");
        return true;
      }

      setNotice("평점 등록에 실패했어요. 잠시 후 다시 시도해주세요.");
      return false;
    },
    [contentId, loggedIn, requireLoginNotice]
  );

  return { ready, loggedIn, myScore, submitting, notice, rate, requireLoginNotice };
}
