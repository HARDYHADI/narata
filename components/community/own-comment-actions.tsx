"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { updateOwnComment, deleteOwnComment } from "@/lib/community/queries";

const FIELD_STYLE: React.CSSProperties = {
  padding: 10,
  borderRadius: 10,
  border: "1px solid rgba(6, 53, 50, 0.16)",
  font: "inherit",
};

// Same pattern as OwnPostActions, scoped to one comment: renders nothing
// until the client-side auth check confirms the viewer is the comment's
// own author.
export default function OwnCommentActions({
  commentId,
  authorUserId,
  currentBody,
  onChanged,
}: {
  commentId: string;
  authorUserId: string;
  currentBody: string;
  onChanged: () => void;
}) {
  const [isOwner, setIsOwner] = useState(false);
  const [mode, setMode] = useState<"idle" | "edit" | "delete">("idle");
  const [body, setBody] = useState(currentBody);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!cancelled && user?.id === authorUserId) setIsOwner(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [authorUserId]);

  function reset() {
    setMode("idle");
    setNotice(null);
  }

  async function handleEdit() {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setBusy(true);
    setNotice(null);
    const result = await updateOwnComment(supabase, commentId, body);
    setBusy(false);

    if (!result.success) {
      setNotice("수정에 실패했어요.");
      return;
    }
    reset();
    onChanged();
  }

  async function handleDelete() {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setBusy(true);
    setNotice(null);
    const result = await deleteOwnComment(supabase, commentId);
    setBusy(false);

    if (!result.success) {
      setNotice("삭제에 실패했어요.");
      return;
    }
    reset();
    onChanged();
  }

  if (!isOwner) return null;

  if (mode === "idle") {
    return (
      <span style={{ display: "inline-flex", gap: 10 }}>
        <span style={{ cursor: "pointer" }} onClick={() => setMode("edit")}>
          수정
        </span>
        <span style={{ cursor: "pointer" }} onClick={() => setMode("delete")}>
          삭제
        </span>
      </span>
    );
  }

  return (
    <div
      style={{
        marginTop: 8,
        padding: 10,
        border: "1px solid rgba(6, 53, 50, 0.16)",
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {mode === "edit" && (
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          style={{ ...FIELD_STYLE, resize: "vertical", width: "100%" }}
        />
      )}
      {mode === "delete" && <div className="sub">정말 삭제할까요? 되돌릴 수 없어요.</div>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" className="pill" onClick={reset}>
          취소
        </button>
        <button type="button" className="btn orange" disabled={busy} onClick={mode === "edit" ? handleEdit : handleDelete}>
          {mode === "edit" ? "수정 완료" : "삭제"}
        </button>
      </div>
      {notice && (
        <div className="muted" style={{ fontSize: 12 }}>
          {notice}
        </div>
      )}
    </div>
  );
}
