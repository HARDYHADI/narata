import Link from "next/link";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import CategoryBar from "@/components/category-bar";
import MovieCard from "@/components/movie-card";
import AuthStatus from "@/components/auth-status";
import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchRecentMovies } from "@/lib/movies/queries";

export const revalidate = 60;

// NOTE: today's episode-release schedule and the studio ranking have no
// real data source yet (same as the movie home page's static news/ranking
// sections) — these stay as static sample content from the approved design.

const TODAY_EPISODES = [
  { time: "18:00 · TV", title: "별의 정원 7화", note: "스튜디오 토리" },
  { time: "20:30 · ONA", title: "푸른 우체국 5화", note: "NARATA 평점 4.6" },
  { time: "22:00 · TV", title: "유리의 성 9화", note: "원작 만화 6권" },
  { time: "23:30 · TV", title: "붉은 행성 4화", note: "댓글 1.8천" },
  { time: "24:00 · TV", title: "야간열차 8화", note: "스포일러 보호" },
];

const STUDIOS = [
  { rank: 1, name: "Studio TORI", note: "작품 28" },
  { rank: 2, name: "Blue Frame", note: "작품 17" },
  { rank: 3, name: "Paper Moon", note: "작품 21" },
  { rank: 4, name: "North Animation", note: "작품 14" },
];

export default async function AnimePage() {
  const supabase = getSupabaseClient();
  const recentAnime = supabase ? await fetchRecentMovies(supabase, 10, "ANIME") : [];
  const heroAnime = recentAnime.slice(0, 4);
  const featured = recentAnime[0];

  return (
    <>
      <SiteHeader
        active="content"
        searchPlaceholder="애니·성우·제작사 검색"
        actions={
          <>
            <button className="btn orange">AI 찾기</button>
            <AuthStatus />
          </>
        }
      />
      <CategoryBar
        label="애니"
        homeLabel="애니 홈"
        tabs={["2026 여름", "TV", "극장판", "OVA·ONA", "완결작", "방영표"]}
      />

      <div className="wrap">
        <div className="hero">
          <div>
            <span className="pill orange">최근 수집된 애니</span>
            <h1>
              이번 분기 애니를
              <br />
              놓치지 않는 방법
            </h1>
            <p>TMDB에서 수집한 애니 정보를 평점, 장르와 함께 한곳에서 만나보세요.</p>
            {featured && (
              <div className="actions">
                <Link href={`/movies/${featured.id}`} className="btn orange">
                  {featured.canonical_title} 보기
                </Link>
              </div>
            )}
          </div>
          <div className="hero-grid">
            {heroAnime.length > 0 ? (
              heroAnime.map((anime) => (
                <div key={anime.id} className="genre">
                  <small>{anime.content_genre[0]?.genre?.name ?? "ANIME"}</small>
                  <b>{anime.canonical_title}</b>
                </div>
              ))
            ) : (
              <div className="genre">
                <small>ANIME</small>
                <b>아직 수집된 애니가 없어요</b>
              </div>
            )}
          </div>
        </div>

        <div className="section" style={{ borderTop: 0, paddingTop: 0 }}>
          <div className="headrow">
            <div>
              <h2>최근 수집된 애니</h2>
              <div className="sub">TMDB에서 가져온 애니를 공개일 최신순으로 보여줍니다</div>
            </div>
          </div>
          {recentAnime.length === 0 ? (
            <p className="muted">아직 등록된 애니가 없습니다.</p>
          ) : (
            <div className="content-grid">
              {recentAnime.map((anime) => (
                <MovieCard key={anime.id} movie={anime} />
              ))}
            </div>
          )}
        </div>

        <div className="section">
          <div className="detail-grid">
            <div className="card panel">
              <h3>오늘 공개되는 에피소드</h3>
              <div className="schedule">
                {TODAY_EPISODES.map((ep) => (
                  <div key={ep.title} className="episode">
                    <span>{ep.time}</span>
                    <b>{ep.title}</b>
                    <span>{ep.note}</span>
                  </div>
                ))}
              </div>
            </div>
            <aside className="card panel">
              <h3>인기 제작사</h3>
              {STUDIOS.map((s) => (
                <div key={s.rank} className="listrow">
                  <b>{s.rank}</b>
                  <span>{s.name}</span>
                  <small>{s.note}</small>
                </div>
              ))}
            </aside>
          </div>
        </div>
      </div>

      <SiteFooter
        title="분기 신작에서 원작까지 한 번에"
        subtitle="방영표 · 제작사 · 성우 · 원작 관계"
      />
    </>
  );
}
