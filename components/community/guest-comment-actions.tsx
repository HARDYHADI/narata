"use client";

import { useState } from "react";

const FIELD_STYLE: React.CSSProperties = {
  padding: 10,
  borderRadius: 10,
  border: "1px solid rgba(6, 53, 50, 0.16)",
  font: "inherit",
};

// Same pattern as GuestPostActions, scoped to one comment. Shown only when
// comment.user_id === null.
export default function GuestCommentActions({
  commentId,
  currentBody,
  onChanged,
}: {
  commentId: string;
  currentBody: string;
  onChanged: () => void;
}) {
  const [mode, setMode] = useState<"idle" | "edit" | "delete">("idle");
  const [password, setPassword] = useState("");
  const [body, setBody] = useState(currentBody);
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
      const res = await fetch(`/api/community/comments/${commentId}/guest-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "delete" ? { password, action } : { password, action, body }),
      });
      const result = await res.json();
      setBusy(false);

      if (!result.success) {
        setNotice(result.error === "invalid_password" ? "비밀번호가 올바르지 않아요." : "처리에 실패했어요.");
        return;
      }

      reset();
      onChanged();
    } catch (err) {
      console.error("failed guest comment action", err);
      setBusy(false);
      setNotice("처리에 실패했어요.");
    }
  }

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
