"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { createPostComment } from "@/lib/community/queries";
import CaptchaWidget from "./captcha-widget";

const MIN_GUEST_PASSWORD_LENGTH = 4;

const FIELD_STYLE: React.CSSProperties = {
  padding: 10,
  borderRadius: 10,
  border: "1px solid rgba(6, 53, 50, 0.16)",
  font: "inherit",
};

export default function CommentReplyForm({
  postId,
  parentCommentId,
  loggedIn,
  allowAnonymousPosts,
  onSubmitted,
  onCancel,
}: {
  postId: string;
  parentCommentId: string;
  loggedIn: boolean;
  allowAnonymousPosts: boolean;
  onSubmitted: () => void;
  onCancel: () => void;
}) {
  const [body, setBody] = useState("");
  const [guestNickname, setGuestNickname] = useState("");
  const [guestPassword, setGuestPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit() {
    if (!body.trim()) return;
    setPosting(true);
    setNotice(null);

    if (loggedIn) {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setPosting(false);
        return;
      }
      const result = await createPostComment(supabase, postId, body, parentCommentId);
      setPosting(false);
      if (result.success) {
        onSubmitted();
      } else {
        setNotice("답글 등록에 실패했어요.");
      }
      return;
    }

    if (allowAnonymousPosts) {
      if (guestPassword.length < MIN_GUEST_PASSWORD_LENGTH) {
        setPosting(false);
        setNotice(`비밀번호는 ${MIN_GUEST_PASSWORD_LENGTH}자 이상으로 입력해주세요.`);
        return;
      }
      try {
        const response = await fetch("/api/community/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postId,
            parentCommentId,
            body,
            guestNickname,
            guestPassword,
            captchaToken,
          }),
        });
        const result = await response.json();
        setPosting(false);
        if (result.success) {
          onSubmitted();
        } else {
          setNotice("답글 등록에 실패했어요.");
        }
      } catch (err) {
        console.error("failed to submit anonymous reply", err);
        setPosting(false);
        setNotice("답글 등록에 실패했어요.");
      }
    }
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
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="답글을 입력하세요"
        rows={2}
        style={{ ...FIELD_STYLE, resize: "vertical", width: "100%" }}
      />
      {!loggedIn && allowAnonymousPosts && (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              value={guestNickname}
              onChange={(e) => setGuestNickname(e.target.value)}
              placeholder="닉네임 (선택, 기본 ㅇㅇ)"
              style={{ ...FIELD_STYLE, flex: "1 1 140px" }}
            />
            <input
              value={guestPassword}
              onChange={(e) => setGuestPassword(e.target.value)}
              type="password"
              placeholder="답글 삭제용 비밀번호"
              style={{ ...FIELD_STYLE, flex: "1 1 140px" }}
            />
          </div>
          <CaptchaWidget onVerify={setCaptchaToken} />
        </>
      )}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" className="pill" onClick={onCancel}>
          취소
        </button>
        <button type="button" className="btn orange" disabled={posting || !body.trim()} onClick={handleSubmit}>
          답글 등록
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
