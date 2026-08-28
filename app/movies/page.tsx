import Link from "next/link";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import MovieInfiniteGrid from "@/components/movie-infinite-grid";
import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchMoviePage } from "@/lib/movies/queries";

export const revalidate = 60;

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

      <div className="wrap">
        <div className="page-title">
          <div>
            <span className="eyebrow">CONTENT</span>
            <h1>영화</h1>
            <p>TMDB에서 수집한 영화를 최신 공개일 순으로 보여줍니다.</p>
          </div>
        </div>

        <div className="section" style={{ borderTop: 0, paddingTop: 0 }}>
          <MovieInfiniteGrid initialMovies={initialMovies} />
        </div>
      </div>

      <SiteFooter
        title="모든 매체를 한곳에서"
        subtitle="영화, 드라마, 애니, 웹툰, 웹소설을 통합 검색하고 평가하세요."
      />
    </>
  );
}
