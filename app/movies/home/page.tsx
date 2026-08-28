import Link from "next/link";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import MovieBar from "@/components/movie-bar";
import MovieCard from "@/components/movie-card";
import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchRecentMovies } from "@/lib/movies/queries";

export const revalidate = 60;

// NOTE: "영화 소식과 큐레이션" (editorial news) and "실시간 영화 순위" (live
// ranking) have no backing data source yet — these stay as static sample
// content from the approved design.
const NEWS = [
  { tag: "개봉 예정", title: "9월 기대작 12편, 공개 일정 한눈에 보기", time: "2시간 전" },
  { tag: "기획전", title: "비 오는 날 보기 좋은 미스터리 영화", time: "오늘" },
  { tag: "컬렉션", title: "원작 웹소설보다 결말이 좋은 영화 8편", time: "어제" },
];

const RANKING = [
  { rank: 1, title: "검은 파도의 밤", change: "▲ 4" },
  { rank: 2, title: "별의 정원", change: "NEW" },
  { rank: 3, title: "여름의 증언", change: "▲ 1" },
  { rank: 4, title: "낯선 신호", change: "▼ 2" },
];

export default async function MovieHomePage() {
  const supabase = getSupabaseClient();
  const recentMovies = supabase ? await fetchRecentMovies(supabase, 10) : [];
  const heroMovies = recentMovies.slice(0, 4);
  const featured = recentMovies[0];

  return (
    <>
      <SiteHeader
        active="content"
        searchPlaceholder="영화 제목·감독·배우 검색"
        actions={
          <>
            <Link href="/ai" className="btn orange">
              AI 찾기
            </Link>
            <button className="btn">로그인</button>
          </>
        }
      />
      <MovieBar active="home" />

      <div className="wrap">
        <div className="hero">
          <div>
            <span className="pill orange">최근 수집된 영화</span>
            <h1>
              극장에서 시작해
              <br />
              이야기로 이어지는 영화
            </h1>
            <p>TMDB에서 수집한 영화 정보를 평점, 장르와 함께 한곳에서 만나보세요.</p>
            {featured && (
              <div className="actions">
                <Link href={`/movies/${featured.id}`} className="btn orange">
                  {featured.canonical_title} 보기
                </Link>
              </div>
            )}
          </div>
          <div className="hero-grid">
            {heroMovies.length > 0 ? (
              heroMovies.map((movie) => (
                <div key={movie.id} className="genre">
                  <small>{movie.content_genre[0]?.genre?.name ?? "영화"}</small>
                  <b>{movie.canonical_title}</b>
                </div>
              ))
            ) : (
              <div className="genre">
                <small>MOVIE</small>
                <b>아직 수집된 영화가 없어요</b>
              </div>
            )}
          </div>
        </div>

        <div className="section" style={{ borderTop: 0, paddingTop: 0 }}>
          <div className="headrow">
            <div>
              <h2>최근 수집된 영화</h2>
              <div className="sub">TMDB에서 가져온 영화를 공개일 최신순으로 보여줍니다</div>
            </div>
          </div>
          {recentMovies.length === 0 ? (
            <p className="muted">아직 등록된 영화가 없습니다.</p>
          ) : (
            <div className="content-grid">
              {recentMovies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          )}
        </div>

        <div className="section">
          <div className="home-lower">
            <div className="card recommend">
              <h2 style={{ fontSize: 23 }}>영화 소식과 큐레이션</h2>
              <div className="history">
                {NEWS.map((n) => (
                  <div key={n.title} className="feedrow">
                    <span>
                      <span className="pill" style={{ marginRight: 8 }}>
                        {n.tag}
                      </span>
                      {n.title}
                    </span>
                    <small className="muted">{n.time}</small>
                  </div>
                ))}
              </div>
            </div>
            <div className="card rank">
              <h2 style={{ fontSize: 23 }}>실시간 영화 순위</h2>
              {RANKING.map((r) => (
                <div key={r.rank} className="rankrow">
                  <b>{r.rank}</b>
                  <span>{r.title}</span>
                  <small>{r.change}</small>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <SiteFooter
        title="모든 매체를 한곳에서"
        subtitle="영화, 드라마, 애니, 웹툰, 웹소설을 통합 검색하고 평가하세요."
      />
    </>
  );
}
