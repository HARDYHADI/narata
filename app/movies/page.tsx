import Link from "next/link";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import MovieBar from "@/components/movie-bar";
import MovieInfiniteGrid from "@/components/movie-infinite-grid";
import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchMoviePage } from "@/lib/movies/queries";

export const revalidate = 60;

const STATUS_FILTERS = ["상영 중", "OTT 공개", "공개 예정"];
const GENRE_FILTERS = ["미스터리", "드라마", "SF", "애니메이션", "다큐멘터리"];
const COUNTRY_FILTERS = ["한국", "미국", "일본", "유럽"];
const YEAR_FILTERS = ["2026", "2020~2025", "2010년대", "고전 영화"];
const WATCH_FILTERS = ["120분 이하", "청소년 관람 가능", "OTT에서 볼 수 있음"];

export default async function MoviesPage() {
  const supabase = getSupabaseClient();
  const initialMovies = supabase ? await fetchMoviePage(supabase, 0) : [];

  return (
    <>
      <SiteHeader
        active="content"
        searchPlaceholder="제목, 인물, 장면을 검색해보세요"
        actions={
          <>
            <Link href="/ai" className="btn orange">
              AI 찾기
            </Link>
            <button className="btn">로그인</button>
          </>
        }
      />
      <MovieBar active="browse" />

      <div className="wrap">
        <div className="page-title">
          <div>
            <span className="eyebrow">MOVIE EXPLORE</span>
            <h1>조건별 영화 탐색</h1>
            <p>장르, 국가, 공개 시기와 감상 조건을 조합해 찾아보세요.</p>
          </div>
          <div className="tabs">
            <button className="tab on">최신순</button>
            <button className="tab">평점순</button>
            <button className="tab">인기순</button>
          </div>
        </div>

        <div className="browse">
          <aside className="card filter">
            <h3>필터</h3>
            <div className="filterset">
              <b>상태</b>
              <div className="checks">
                {STATUS_FILTERS.map((label, i) => (
                  <span key={label} className={`check${i === 0 ? " on" : ""}`}>
                    <i />
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <div className="filterset">
              <b>장르</b>
              <div className="checks">
                {GENRE_FILTERS.map((label, i) => (
                  <span key={label} className={`check${i < 2 ? " on" : ""}`}>
                    <i />
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <div className="filterset">
              <b>국가</b>
              <div className="checks">
                {COUNTRY_FILTERS.map((label, i) => (
                  <span key={label} className={`check${i === 0 ? " on" : ""}`}>
                    <i />
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <div className="filterset">
              <b>개봉 연도</b>
              <div className="checks">
                {YEAR_FILTERS.map((label, i) => (
                  <span key={label} className={`check${i === 1 ? " on" : ""}`}>
                    <i />
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <div className="filterset">
              <b>감상 조건</b>
              <div className="checks">
                {WATCH_FILTERS.map((label, i) => (
                  <span key={label} className={`check${i === 0 ? " on" : ""}`}>
                    <i />
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <button className="btn orange" style={{ width: "100%" }}>
              필터 적용
            </button>
          </aside>

          <div>
            <div className="result-top">
              <b>TMDB에서 수집한 영화</b>
              <span className="sub">선택한 필터 4개</span>
            </div>
            <MovieInfiniteGrid initialMovies={initialMovies} />
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
