"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchReviews, toggleReviewHelpful, type Review, type ReviewSort } from "@/lib/reviews/queries";
import ReportButton from "@/components/community/report-button";

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR");
}

export default function ReviewList({
  contentId,
  initialReviews,
}: {
  contentId: string;
  initialReviews: Review[];
}) {
  const [sort, setSort] = useState<ReviewSort>("helpful");
  const [reviews, setReviews] = useState(initialReviews);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSort(next: ReviewSort) {
    if (next === sort) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    if (next === "taste") {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setNotice("로그인 후 이용할 수 있어요.");
        return;
      }
    }

    setSort(next);
    setNotice(null);
    setLoading(true);
    const data = await fetchReviews(supabase, contentId, next);
    setReviews(data);
    setLoading(false);
  }

  async function handleHelpful(reviewId: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const result = await toggleReviewHelpful(supabase, reviewId);
    if (result.error === "not_authenticated") {
      setNotice("로그인이 필요해요.");
      return;
    }
    if (!result.success) return;

    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, helpful_count: r.helpful_count + (result.active ? 1 : -1) } : r))
    );
  }

  return (
    <div className="card review-list">
      <div style={{ padding: 22, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <b>리뷰 {reviews.length.toLocaleString()}개</b>
        <div className="tabs">
          <button
            type="button"
            className={`tab${sort === "helpful" ? " on" : ""}`}
            onClick={() => handleSort("helpful")}
          >
            추천순
          </button>
          <button type="button" className={`tab${sort === "latest" ? " on" : ""}`} onClick={() => handleSort("latest")}>
            최신순
          </button>
          <button type="button" className={`tab${sort === "taste" ? " on" : ""}`} onClick={() => handleSort("taste")}>
            내 취향순
          </button>
        </div>
      </div>
      {notice && (
        <div className="muted" style={{ padding: "0 22px 12px", fontSize: 12 }}>
          {notice}
        </div>
      )}
      {loading && (
        <div className="muted" style={{ padding: 22 }}>
          불러오는 중...
        </div>
      )}
      {!loading && reviews.length === 0 && (
        <div className="muted" style={{ padding: 22 }}>
          아직 리뷰가 없어요. 첫 리뷰를 남겨보세요.
        </div>
      )}
      {!loading &&
        reviews.map((r) => (
          <article key={r.id} className="review-item">
            <div className="review-head">
              <b>
                {r.author_nickname} <span className="stars">★ {r.score.toFixed(1)}</span>
                {sort === "taste" && r.taste_match_count !== undefined && (
                  <span className="pill" style={{ marginLeft: 8, fontSize: 11 }}>
                    취향 태그 {r.taste_match_count}개 일치
                  </span>
                )}
              </b>
              <span className="sub">{formatRelativeTime(r.created_at)}</span>
            </div>
            <p>
              {r.contains_spoiler && (
                <span className="pill orange" style={{ marginRight: 8 }}>
                  스포일러 포함
                </span>
              )}
              {r.body}
            </p>
            <div className="reaction">
              <span style={{ cursor: "pointer" }} onClick={() => handleHelpful(r.id)}>
                도움돼요 {r.helpful_count}
              </span>
              <ReportButton targetType="REVIEW" targetId={r.id} />
            </div>
          </article>
        ))}
    </div>
  );
}
