"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import PreferenceToggle from "@/components/preference-toggle";
import {
  fetchMyPreferences,
  fetchMyStats,
  fetchMyRecentActivity,
  fetchTasteTags,
  fetchMyAiSearchLogs,
  DEFAULT_PREFERENCES,
  type UserPreference,
  type TasteStats,
  type RecentActivityItem,
  type TasteTags,
  type AiSearchLogItem,
} from "@/lib/taste/queries";

const CONTENT_TYPE_LABELS: Record<string, string> = {
  MOVIE: "영화",
  DRAMA: "드라마",
  ANIME: "애니",
  COMIC: "만화",
  WEBTOON: "웹툰",
  WEBNOVEL: "웹소설",
  OTT_ORIGINAL: "OTT",
};

const CONTROL_ITEMS: { key: keyof UserPreference; label: string }[] = [
  { key: "exclude_watched", label: "이미 본 작품은 추천에서 제외" },
  { key: "limit_franchise_repeats", label: "같은 프랜차이즈 연속 추천 제한" },
  { key: "use_community_activity", label: "커뮤니티 활동도 취향에 반영" },
  { key: "include_adult", label: "성인 콘텐츠 포함" },
];

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

interface DashboardData {
  preferences: UserPreference;
  stats: TasteStats;
  recentActivity: RecentActivityItem[];
  tasteTags: TasteTags;
  aiLogs: AiSearchLogItem[];
  nickname: string;
}

export default function TasteDashboard() {
  const [status, setStatus] = useState<"loading" | "logged_out" | "ready">("loading");
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        if (!cancelled) setStatus("logged_out");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) setStatus("logged_out");
        return;
      }

      const [preferences, stats, recentActivity, tasteTags, aiLogs] = await Promise.all([
        fetchMyPreferences(supabase),
        fetchMyStats(supabase),
        fetchMyRecentActivity(supabase, 6),
        fetchTasteTags(supabase),
        fetchMyAiSearchLogs(supabase, 5),
      ]);

      if (cancelled) return;

      setData({
        preferences,
        stats,
        recentActivity,
        tasteTags,
        aiLogs,
        nickname: user.email?.split("@")[0] ?? "회원",
      });
      setStatus("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="wrap">
        <div className="page-title">
          <div>
            <span className="eyebrow">MY TASTE</span>
            <h1>내 취향을 불러오는 중...</h1>
          </div>
        </div>
      </div>
    );
  }

  if (status === "logged_out") {
    return (
      <div className="wrap">
        <div className="page-title">
          <div>
            <span className="eyebrow">MY TASTE</span>
            <h1>로그인이 필요해요</h1>
            <p>취향 페이지는 나의 평가와 활동을 바탕으로 만들어지는 개인화 화면이에요. 로그인 후 다시 확인해주세요.</p>
          </div>
        </div>
      </div>
    );
  }

  const d = data!;
  const { preferences, stats, recentActivity, tasteTags, aiLogs, nickname } = d;

  // Rough "completion" signal for the header pill: more rated works means a
  // more complete taste profile. Not a precise metric, just a proxy scaled
  // against a reasonable number of ratings.
  const completionPct = Math.min(100, Math.round((stats.ratingCount / 50) * 100));

  return (
    <div className="wrap">
      <div className="page-title">
        <div>
          <span className="eyebrow">MY TASTE</span>
          <h1>{nickname}님의 이야기 취향</h1>
          <p>평가와 활동을 바탕으로 추천 기준을 확인하고 직접 조정할 수 있어요.</p>
        </div>
        <span className="pill orange">취향 데이터 {completionPct}% 완성</span>
      </div>

      <div className="profile">
        <div className="card profile-main">
          <div className="avatar">{nickname.charAt(0).toUpperCase()}</div>
          <div className="profile-copy">
            <h2>{nickname}</h2>
            <div className="muted">
              {stats.ratingCount > 0
                ? `${stats.ratingCount}개의 작품을 평가하며 취향을 쌓아가고 있어요.`
                : "아직 평가한 작품이 없어요. 첫 평가를 남겨보세요."}
            </div>
            <div className="stats">
              <div className="stat">
                <b>{stats.ratingCount}</b>
                <span className="sub">평가</span>
              </div>
              <div className="stat">
                <b>{stats.reviewCount}</b>
                <span className="sub">리뷰</span>
              </div>
              <div className="stat">
                <b>{stats.collectionCount}</b>
                <span className="sub">컬렉션</span>
              </div>
              <div className="stat">
                <b>{stats.averageScore > 0 ? stats.averageScore.toFixed(1) : "-"}</b>
                <span className="sub">평균 별점</span>
              </div>
            </div>
          </div>
        </div>
        <div className="card sync">
          <span className="pill orange">최근 활동</span>
          <h3>
            {recentActivity.length > 0
              ? `최근 ${recentActivity.length}개 작품을 평가했어요`
              : "평가를 남기면 취향 신호가 쌓여요"}
          </h3>
          <p>
            {tasteTags.liked.length > 0
              ? `‘${tasteTags.liked[0].label}’ 등의 요소가 추천에 반영되고 있습니다.`
              : "좋아하는 요소가 쌓이면 추천에 반영돼요."}
          </p>
          <button className="btn orange">추천 새로 보기</button>
        </div>
      </div>

      <div className="taste-grid">
        <div className="taste-col">
          <div className="card taste-panel">
            <h3>내가 좋아하는 요소</h3>
            <div className="sub">진하게 표시될수록 추천에 더 크게 반영됩니다.</div>
            <div className="tag-cloud">
              {tasteTags.liked.length === 0 && (
                <span className="sub">평점 4점 이상인 작품에 태그를 남기면 여기에 표시돼요.</span>
              )}
              {tasteTags.liked.map((tag) => (
                <span key={tag.tag_id} className={`tag${tag.emphasized ? " strong" : ""}`}>
                  {tag.label}
                </span>
              ))}
            </div>
          </div>
          <div className="card taste-panel">
            <div className="headrow" style={{ margin: 0 }}>
              <div>
                <h3>최근 평가</h3>
                <div className="sub">추천이 이상하면 평가를 수정해보세요.</div>
              </div>
              <button className="tab">전체 기록</button>
            </div>
            <div className="history">
              {recentActivity.length === 0 && <div className="sub">아직 평가한 작품이 없어요.</div>}
              {recentActivity.map((h) => (
                <div key={h.id} className="history-row">
                  <div className="mini-cover" />
                  <b title={h.review_body ?? undefined}>
                    {h.title}
                    {h.review_body ? " ✏️" : ""}
                  </b>
                  <span>{CONTENT_TYPE_LABELS[h.content_type] ?? h.content_type}</span>
                  <span className="stars">★ {h.score.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="taste-col">
          <div className="card taste-panel">
            <h3>추천에서 줄일 요소</h3>
            <div className="sub">관심 없음 피드백을 바탕으로 추정했어요.</div>
            <div className="tag-cloud">
              {tasteTags.avoid.length === 0 && (
                <span className="sub">평점 2.5점 이하인 작품에 태그를 남기면 여기에 표시돼요.</span>
              )}
              {tasteTags.avoid.map((tag) => (
                <span key={tag.tag_id} className={`tag${tag.emphasized ? " avoid" : ""}`}>
                  {tag.label}
                </span>
              ))}
            </div>
          </div>
          <div className="card taste-panel">
            <h3>추천 제어</h3>
            {CONTROL_ITEMS.map((c) => (
              <PreferenceToggle
                key={c.key}
                label={c.label}
                prefKey={c.key}
                initialOn={preferences[c.key] ?? DEFAULT_PREFERENCES[c.key]}
              />
            ))}
          </div>
          <div className="card taste-panel">
            <div className="headrow" style={{ margin: 0 }}>
              <h3>최근 AI 찾기</h3>
              <span className="pill">기록 관리</span>
            </div>
            {aiLogs.length === 0 && <div className="sub">아직 AI 찾기 기록이 없어요.</div>}
            {aiLogs.map((log) => (
              <div key={log.id} className="ai-log">
                <b>{log.query_text}</b>
                <span>
                  추천 {log.result_count}개 · {formatRelativeTime(log.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
