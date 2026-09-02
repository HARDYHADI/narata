"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchHomeRecommendations, type HomeRecommendations } from "@/lib/taste/queries";

const TONES = ["", "tone-2", "tone-3"];

const CONTENT_TYPE_LABELS: Record<string, string> = {
  MOVIE: "영화",
  DRAMA: "드라마",
  ANIME: "애니",
};

export default function HomeRecommendations() {
  const [data, setData] = useState<HomeRecommendations | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const result = await fetchHomeRecommendations(supabase, 3);
      if (!cancelled) setData(result);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const personalized = data?.personalized ?? false;

  return (
    <div className="card recommend">
      <div className="headrow" style={{ margin: 0 }}>
        <div>
          <h2 style={{ fontSize: 24 }}>{personalized ? "회원님 취향에 맞는 작품" : "지금 인기 있는 작품"}</h2>
          <div className="sub">
            {personalized
              ? "높게 평가한 작품과 같은 장르에서 골라봤어요"
              : "평점 데이터가 쌓이면 취향에 맞는 작품으로 바뀌어요"}
          </div>
        </div>
      </div>
      <div className="recs">
        {data === null && <small className="muted">불러오는 중...</small>}
        {data !== null && data.items.length === 0 && (
          <small className="muted">아직 추천할 작품이 없어요.</small>
        )}
        {data?.items.map((item, i) => (
          <Link key={item.id} href={`/movies/${item.id}`} className={`rec ${TONES[i % TONES.length]}`}>
            <small>
              {CONTENT_TYPE_LABELS[item.content_type] ?? item.content_type}
              {item.genre_name ? ` · ${item.genre_name}` : ""}
            </small>
            <b>{item.title}</b>
            <small>{item.external_rating != null ? `TMDB 평점 ${item.external_rating.toFixed(1)}` : ""}</small>
          </Link>
        ))}
      </div>
    </div>
  );
}
