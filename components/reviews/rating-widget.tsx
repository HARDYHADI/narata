"use client";

import { useRouter } from "next/navigation";
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

export default function RatingWidget({ contentId }: { contentId: string }) {
  const router = useRouter();
  const { ready, loggedIn, myScore, submitting, notice, rate, requireLoginNotice } = useMyRating(contentId);

  async function handleClick(value: number) {
    const ok = await rate(value);
    if (ok) router.refresh();
  }

  if (ready && loggedIn) {
    return (
      <div style={{ marginTop: 12, textAlign: "center" }}>
        <div className="stars" style={{ fontSize: 25 }}>
          {STAR_VALUES.map((value) => (
            <button
              key={value}
              type="button"
              disabled={submitting}
              onClick={() => handleClick(value)}
              style={STAR_BUTTON_STYLE}
            >
              {myScore !== null && value <= Math.round(myScore) ? "★" : "☆"}
            </button>
          ))}
        </div>
        {notice && (
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            {notice}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button type="button" className="btn orange ratebtn" onClick={requireLoginNotice}>
        내 별점 남기기
      </button>
      {notice && (
        <div className="muted" style={{ fontSize: 12, marginTop: 8, textAlign: "center" }}>
          {notice}
        </div>
      )}
    </>
  );
}
