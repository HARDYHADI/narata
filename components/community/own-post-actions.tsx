"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { updateOwnPost, deleteOwnPost } from "@/lib/community/queries";

const FIELD_STYLE: React.CSSProperties = {
  padding: 10,
  borderRadius: 10,
  border: "1px solid rgba(6, 53, 50, 0.16)",
  font: "inherit",
};

// Renders nothing until the client-side auth check confirms the viewer is
// the post's own author (this app has no server-side session, so ownership
// can only be checked client-side — see AGENTS notes on the OAuth setup).
// Guest posts use GuestPostActions (password-verified) instead; this relies
// on RLS ("own update/delete post": auth.uid() = user_id).
export default function OwnPostActions({
  postId,
  authorUserId,
  currentTitle,
  currentBody,
  currentSpoiler,
  basePath,
}: {
  postId: string;
  authorUserId: string;
  currentTitle: string;
  currentBody: string;
  currentSpoiler: boolean;
  basePath: string;
}) {
  const router = useRouter();
  const [isOwner, setIsOwner] = useState(false);
  const [mode, setMode] = useState<"idle" | "edit" | "delete">("idle");
  const [title, setTitle] = useState(currentTitle);
  const [body, setBody] = useState(currentBody);
  const [spoiler, setSpoiler] = useState(currentSpoiler);
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
    const result = await updateOwnPost(supabase, postId, { title, body, containsSpoiler: spoiler });
    setBusy(false);

    if (!result.success) {
      setNotice("수정에 실패했어요.");
      return;
    }
    reset();
    router.refresh();
  }

  async function handleDelete() {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setBusy(true);
    setNotice(null);
    const result = await deleteOwnPost(supabase, postId);
    setBusy(false);

    if (!result.success) {
      setNotice("삭제에 실패했어요.");
      return;
    }
    router.push(basePath);
  }

  if (!isOwner) return null;

  if (mode === "idle") {
    return (
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="pill" onClick={() => setMode("edit")}>
          수정
        </button>
        <button type="button" className="pill" onClick={() => setMode("delete")}>
          삭제
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        border: "1px solid rgba(6, 53, 50, 0.16)",
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {mode === "edit" && (
        <>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목" style={FIELD_STYLE} />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            style={{ ...FIELD_STYLE, resize: "vertical", width: "100%" }}
          />
          <label className="sub" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} />
            스포일러 포함
          </label>
        </>
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
