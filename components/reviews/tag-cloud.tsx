"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { toggleTagVote, type TagVotePercentage } from "@/lib/reviews/queries";

export default function TagCloud({
  contentId,
  initialTags,
}: {
  contentId: string;
  initialTags: TagVotePercentage[];
}) {
  const [tags, setTags] = useState(initialTags);
  const [voted, setVoted] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);

  async function handleToggle(tagId: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const result = await toggleTagVote(supabase, contentId, tagId);
    if (result.error === "not_authenticated") {
      setNotice("로그인이 필요해요.");
      return;
    }
    if (!result.success) return;

    setVoted((prev) => {
      const next = new Set(prev);
      if (result.active) next.add(tagId);
      else next.delete(tagId);
      return next;
    });
    setTags((prev) =>
      prev.map((t) => (t.tag_id === tagId ? { ...t, votes: t.votes + (result.active ? 1 : -1) } : t))
    );
  }

  if (tags.length === 0) {
    return <div className="muted">아직 등록된 태그 반응이 없어요.</div>;
  }

  const sorted = [...tags].sort((a, b) => b.percentage - a.percentage);

  return (
    <>
      <div className="tag-cloud">
        {sorted.map((tag, i) => (
          <button
            key={tag.tag_id}
            type="button"
            className={`pill${i < 2 || voted.has(tag.tag_id) ? " on" : ""}`}
            style={{ border: 0, cursor: "pointer" }}
            onClick={() => handleToggle(tag.tag_id)}
          >
            {tag.name} {tag.percentage}%
          </button>
        ))}
      </div>
      {notice && (
        <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          {notice}
        </div>
      )}
    </>
  );
}
