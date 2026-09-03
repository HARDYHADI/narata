"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { createPostComment, fetchPostComments, type CommentItem } from "@/lib/community/queries";
import CaptchaWidget from "./captcha-widget";
import CommentNode from "./comment-node";

const MIN_GUEST_PASSWORD_LENGTH = 4;

function buildCommentTree(comments: CommentItem[]) {
  const topLevel: CommentItem[] = [];
  const childrenByParent = new Map<string, CommentItem[]>();

  for (const comment of comments) {
    if (!comment.parent_comment_id) {
      topLevel.push(comment);
      continue;
    }
    const siblings = childrenByParent.get(comment.parent_comment_id) ?? [];
    siblings.push(comment);
    childrenByParent.set(comment.parent_comment_id, siblings);
  }

  return { topLevel, childrenByParent };
}

export default function CommentSection({
  postId,
  allowAnonymousPosts,
  initialComments,
}: {
  postId: string;
  allowAnonymousPosts: boolean;
  initialComments: CommentItem[];
}) {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [comments, setComments] = useState(initialComments);

  const [body, setBody] = useState("");
  const [guestNickname, setGuestNickname] = useState("");
  const [guestPassword, setGuestPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
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
      if (!cancelled) setLoggedIn(Boolean(user));
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshComments() {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const data = await fetchPostComments(supabase, postId);
    setComments(data);
  }

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
      const result = await createPostComment(supabase, postId, body);
      setPosting(false);
      if (result.success) {
        setBody("");
        await refreshComments();
      } else {
        setNotice("댓글 등록에 실패했어요.");
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
          body: JSON.stringify({ postId, body, guestNickname, guestPassword, captchaToken }),
        });
        const result = await response.json();
        setPosting(false);
        if (result.success) {
          setBody("");
          setGuestPassword("");
          await refreshComments();
        } else {
          setNotice("댓글 등록에 실패했어요.");
        }
      } catch (err) {
        console.error("failed to submit anonymous comment", err);
        setPosting(false);
        setNotice("댓글 등록에 실패했어요.");
      }
    }
  }

  const { topLevel, childrenByParent } = buildCommentTree(comments);

  return (
    <div className="card review-list">
      <div style={{ padding: 22 }}>
        <b>댓글 {comments.length.toLocaleString()}개</b>
      </div>

      {comments.length === 0 && (
        <div className="muted" style={{ padding: "0 22px 22px" }}>
          아직 댓글이 없어요. 첫 댓글을 남겨보세요.
        </div>
      )}

      {topLevel.map((c) => (
        <CommentNode
          key={c.id}
          comment={c}
          childrenByParent={childrenByParent}
          depth={0}
          postId={postId}
          loggedIn={loggedIn}
          allowAnonymousPosts={allowAnonymousPosts}
          onChanged={refreshComments}
        />
      ))}

      {ready && (
        <div style={{ padding: 22, borderTop: "1px solid var(--line)" }}>
          {!loggedIn && !allowAnonymousPosts ? (
            <div className="muted">이 갤러리는 로그인 후 댓글을 남길 수 있어요.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="댓글을 입력하세요"
                rows={3}
                style={{
                  width: "100%",
                  resize: "vertical",
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid rgba(6, 53, 50, 0.16)",
                  font: "inherit",
                }}
              />
              {!loggedIn && allowAnonymousPosts && (
                <>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input
                      value={guestNickname}
                      onChange={(e) => setGuestNickname(e.target.value)}
                      placeholder="닉네임 (선택, 기본 ㅇㅇ)"
                      style={{
                        flex: "1 1 160px",
                        padding: 10,
                        borderRadius: 10,
                        border: "1px solid rgba(6, 53, 50, 0.16)",
                        font: "inherit",
                      }}
                    />
                    <input
                      value={guestPassword}
                      onChange={(e) => setGuestPassword(e.target.value)}
                      type="password"
                      placeholder="댓글 삭제용 비밀번호"
                      style={{
                        flex: "1 1 160px",
                        padding: 10,
                        borderRadius: 10,
                        border: "1px solid rgba(6, 53, 50, 0.16)",
                        font: "inherit",
                      }}
                    />
                  </div>
                  <CaptchaWidget onVerify={setCaptchaToken} />
                </>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="button" className="btn orange" disabled={posting || !body.trim()} onClick={handleSubmit}>
                  댓글 등록
                </button>
              </div>
            </div>
          )}
          {notice && (
            <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              {notice}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
