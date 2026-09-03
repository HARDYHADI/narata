"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchLikedTagIdsByUser, type TagVotePercentage } from "@/lib/reviews/queries";

type Status = "loading" | "logged_out" | "no_taste_data" | "ready";

// Replaces what used to be a hardcoded sample sentence ("지우님이 높게
// 평가한 ...", "취향 일치 92%") with a real comparison: which of this
// content's actually-voted tags overlap with tags the current viewer has
// themselves voted on content they rated highly (same "liked tag" grounding
// used by the taste page and the review "내 취향순" sort). No fabricated
// percentage — just the real matched tags and their count.
export default function TasteMatch({ contentTags }: { contentTags: TagVotePercentage[] }) {
  const [status, setStatus] = useState<Status>("loading");
  const [matches, setMatches] = useState<TagVotePercentage[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setStatus("logged_out");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setStatus("logged_out");
        return;
      }

      const likedByUser = await fetchLikedTagIdsByUser(supabase, [user.id]);
      if (cancelled) return;

      const myTags = likedByUser.get(user.id) ?? new Set<string>();
      if (myTags.size === 0) {
        setStatus("no_taste_data");
        return;
      }

      setMatches(contentTags.filter((tag) => myTags.has(tag.tag_id)));
      setStatus("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [contentTags]);

  if (status === "loading") return null;

  if (status === "logged_out") {
    return (
      <>
        <h3 style={{ marginTop: 25 }}>내 취향과의 일치</h3>
        <p className="sub">로그인하면 내 취향과 이 작품이 얼마나 겹치는지 확인할 수 있어요.</p>
      </>
    );
  }

  if (status === "no_taste_data") {
    return (
      <>
        <h3 style={{ marginTop: 25 }}>내 취향과의 일치</h3>
        <p className="sub">평점과 태그를 남기면 취향 일치 요소를 보여드려요.</p>
      </>
    );
  }

  if (matches.length === 0) {
    return (
      <>
        <h3 style={{ marginTop: 25 }}>내 취향과의 일치</h3>
        <p className="sub">아직 겹치는 취향 요소가 없어요.</p>
      </>
    );
  }

  const shown = matches.slice(0, 3).map((tag) => `'${tag.name}'`).join(", ");
  const rest = matches.length > 3 ? ` 등 ${matches.length}개` : "";

  return (
    <>
      <h3 style={{ marginTop: 25 }}>내 취향과의 일치</h3>
      <p className="synopsis">내가 좋아하는 {shown}{rest} 요소가 이 작품에도 있어요.</p>
      <span className="pill orange">일치 요소 {matches.length}개</span>
    </>
  );
}
