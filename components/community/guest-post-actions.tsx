"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const FIELD_STYLE: React.CSSProperties = {
  padding: 10,
  borderRadius: 10,
  border: "1px solid rgba(6, 53, 50, 0.16)",
  font: "inherit",
};

// Shown only for a guest-authored post (post.user_id === null) — logged-in
// users edit/delete their own posts directly through RLS elsewhere, not
// this route. Password is never stored client-side beyond this form state.
export default function GuestPostActions({
  postId,
  currentTitle,
  currentBody,
  currentSpoiler,
  basePath,
}: {
  postId: string;
  currentTitle: string;
  currentBody: string;
  currentSpoiler: boolean;
  basePath: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "edit" | "delete">("idle");
  const [password, setPassword] = useState("");
  const [title, setTitle] = useState(currentTitle);
  const [body, setBody] = useState(currentBody);
  const [spoiler, setSpoiler] = useState(currentSpoiler);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function reset() {
    setMode("idle");
    setPassword("");
    setNotice(null);
  }

  async function submit(action: "edit" | "delete") {
    if (!password) {
      setNotice("비밀번호를 입력해주세요.");
      return;
    }
    setBusy(true);
    setNotice(null);

    try {
      const res = await fetch(`/api/community/posts/${postId}/guest-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "delete"
            ? { password, action }
            : { password, action, title, body, containsSpoiler: spoiler }
        ),
      });
      const result = await res.json();
      setBusy(false);

      if (!result.success) {
        setNotice(result.error === "invalid_password" ? "비밀번호가 올바르지 않아요." : "처리에 실패했어요.");
        return;
      }

      if (action === "delete") {
        router.push(basePath);
      } else {
        reset();
        router.refresh();
      }
    } catch (err) {
      console.error("failed guest post action", err);
      setBusy(false);
      setNotice("처리에 실패했어요.");
    }
  }

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
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="작성 시 설정한 비밀번호"
        style={FIELD_STYLE}
      />
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" className="pill" onClick={reset}>
          취소
        </button>
        <button type="button" className="btn orange" disabled={busy} onClick={() => submit(mode)}>
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
