"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { createPost } from "@/lib/community/queries";
import { POST_HEADS } from "@/lib/community/format";
import CaptchaWidget from "./captcha-widget";

const SELECTABLE_HEADS = POST_HEADS.filter((head) => head !== "공지");
const MIN_GUEST_PASSWORD_LENGTH = 4;

export default function PostWriteBox({
  galleryId,
  allowAnonymousPosts,
  basePath,
}: {
  galleryId: string;
  allowAnonymousPosts: boolean;
  /** e.g. `/movies/${id}/gallery` — the new post's detail page is `${basePath}/${postId}`. */
  basePath: string;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [open, setOpen] = useState(false);

  const [head, setHead] = useState<string>(SELECTABLE_HEADS[0]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [spoiler, setSpoiler] = useState(false);
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

  const canWriteAnonymously = allowAnonymousPosts && !loggedIn;
  const mustLogin = !allowAnonymousPosts && !loggedIn;

  function resetForm() {
    setTitle("");
    setBody("");
    setSpoiler(false);
    setGuestNickname("");
    setGuestPassword("");
    setCaptchaToken(null);
  }

  async function handleSubmit() {
    if (!title.trim() || !body.trim()) return;

    setPosting(true);
    setNotice(null);

    if (loggedIn) {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setPosting(false);
        return;
      }
      const result = await createPost(supabase, {
        galleryId,
        head,
        title,
        body,
        containsSpoiler: spoiler,
      });
      setPosting(false);
      if (result.success && result.postId) {
        router.push(`${basePath}/${result.postId}`);
      } else {
        setNotice("게시글 등록에 실패했어요. 잠시 후 다시 시도해주세요.");
      }
      return;
    }

    if (canWriteAnonymously) {
      if (guestPassword.length < MIN_GUEST_PASSWORD_LENGTH) {
        setPosting(false);
        setNotice(`비밀번호는 ${MIN_GUEST_PASSWORD_LENGTH}자 이상으로 입력해주세요.`);
        return;
      }
      try {
        const response = await fetch("/api/community/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            galleryId,
            head,
            title,
            body,
            containsSpoiler: spoiler,
            guestNickname,
            guestPassword,
            captchaToken,
          }),
        });
        const result = await response.json();
        setPosting(false);
        if (result.success) {
          resetForm();
          setOpen(false);
          setNotice("게시글을 등록했어요.");
          router.refresh();
        } else {
          setNotice("게시글 등록에 실패했어요. 잠시 후 다시 시도해주세요.");
        }
      } catch (err) {
        console.error("failed to submit anonymous post", err);
        setPosting(false);
        setNotice("게시글 등록에 실패했어요. 잠시 후 다시 시도해주세요.");
      }
    }
  }

  if (!ready) return null;

  return (
    <div className="card write-box" style={{ flexDirection: "column", alignItems: "stretch" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
        <div>
          <b>새 글 쓰기</b>
          {mustLogin && (
            <div className="sub" style={{ marginTop: 4 }}>
              이 갤러리는 로그인 후 글쓰기가 가능해요.
            </div>
          )}
          {canWriteAnonymously && (
            <div className="sub" style={{ marginTop: 4 }}>
              닉네임 없이 ㅇㅇ로 남기거나, 닉네임과 비밀번호를 정해 글을 쓸 수 있어요. 비밀번호를 잊으면 찾을
              방법이 없어요.
            </div>
          )}
        </div>
        {!mustLogin && (
          <button type="button" className="btn orange" onClick={() => setOpen((v) => !v)}>
            {open ? "닫기" : "글쓰기"}
          </button>
        )}
      </div>

      {open && !mustLogin && (
        <div style={{ width: "100%", marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {SELECTABLE_HEADS.map((h) => (
              <button
                key={h}
                type="button"
                className={`pill${head === h ? " on" : ""}`}
                onClick={() => setHead(h)}
              >
                {h}
              </button>
            ))}
          </div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목"
            style={{
              padding: 10,
              borderRadius: 10,
              border: "1px solid rgba(6, 53, 50, 0.16)",
              font: "inherit",
            }}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="내용을 입력하세요"
            rows={6}
            style={{
              width: "100%",
              resize: "vertical",
              padding: 10,
              borderRadius: 10,
              border: "1px solid rgba(6, 53, 50, 0.16)",
              font: "inherit",
            }}
          />

          {canWriteAnonymously && (
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
                placeholder="글 삭제/수정용 비밀번호"
                style={{
                  flex: "1 1 160px",
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid rgba(6, 53, 50, 0.16)",
                  font: "inherit",
                }}
              />
            </div>
          )}

          {canWriteAnonymously && <CaptchaWidget onVerify={setCaptchaToken} />}

          <label className="sub" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} />
            스포일러 포함
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              className="btn orange"
              disabled={posting || !title.trim() || !body.trim()}
              onClick={handleSubmit}
            >
              게시
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
  );
}
