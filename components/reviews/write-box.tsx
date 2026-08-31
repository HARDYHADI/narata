"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { submitReview } from "@/lib/reviews/queries";
import { useMyRating } from "./use-my-rating";

const STAR_VALUES = [1, 2, 3, 4, 5];
const STAR_BUTTON_STYLE = {
  background: "none",
  border: 0,
  padding: 2,
  cursor: "pointer",
  font: "inherit",
  color: "inherit",
} as const;

export default function WriteBox({ contentId }: { contentId: string }) {
  const router = useRouter();
  const { loggedIn, myScore, submitting, notice, rate, requireLoginNotice } = useMyRating(contentId);
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postNotice, setPostNotice] = useState<string | null>(null);

  async function handleStarClick(value: number) {
    const ok = await rate(value);
    if (ok) {
      setOpen(true);
      router.refresh();
    }
  }

  async function handleSubmitReview() {
    if (!loggedIn) {
      requireLoginNotice();
      return;
    }
    if (!body.trim()) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    setPosting(true);
    setPostNotice(null);
    const result = await submitReview(supabase, contentId, body.trim(), spoiler);
    setPosting(false);

    if (result.success) {
      setPostNotice("리뷰를 게시했어요.");
      setBody("");
      router.refresh();
    } else if (result.error === "rating_required") {
      setPostNotice("별점을 먼저 남겨주세요.");
    } else {
      setPostNotice("리뷰 게시에 실패했어요. 잠시 후 다시 시도해주세요.");
    }
  }

  return (
    <div className="card write-box" id="write-box">
      <div>
        <b>이 작품을 어떻게 보셨나요?</b>
        <div className="sub">별점과 짧은 감상을 남기면 추천이 더 정교해져요.</div>
        {notice && (
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            {notice}
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span className="stars" style={{ fontSize: 25 }}>
          {STAR_VALUES.map((value) => (
            <button
              key={value}
              type="button"
              disabled={submitting}
              onClick={() => handleStarClick(value)}
              style={STAR_BUTTON_STYLE}
            >
              {myScore !== null && value <= Math.round(myScore) ? "★" : "☆"}
            </button>
          ))}
        </span>
        <button
          type="button"
          className="btn orange"
          onClick={() => (loggedIn ? setOpen((v) => !v) : requireLoginNotice())}
        >
          리뷰 작성
        </button>
      </div>
      {open && loggedIn && (
        <div style={{ width: "100%", marginTop: 16 }}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="스포일러 없이 감상을 적어주세요"
            rows={4}
            style={{
              width: "100%",
              resize: "vertical",
              padding: 10,
              borderRadius: 10,
              border: "1px solid rgba(6, 53, 50, 0.16)",
              font: "inherit",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
            <label className="sub" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} />
              스포일러 포함
            </label>
            <button type="button" className="btn orange" disabled={posting || !body.trim()} onClick={handleSubmitReview}>
              게시
            </button>
          </div>
          {postNotice && (
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              {postNotice}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
