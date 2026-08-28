import Link from "next/link";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { getSupabaseClient } from "@/lib/supabase/client";

export const revalidate = 60;

interface MovieListRow {
  id: string;
  canonical_title: string;
  release_date: string | null;
  poster_url: string | null;
  average_rating: number;
  content_genre: { genre: { name: string } | null }[];
}

async function getMovies(): Promise<MovieListRow[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("content")
    .select(
      "id, canonical_title, release_date, poster_url, average_rating, content_genre(genre(name))"
    )
    .eq("content_type", "MOVIE")
    .order("release_date", { ascending: false, nullsFirst: false })
    .limit(50);

  if (error) {
    console.error("failed to load movies", error);
    return [];
  }

  return (data ?? []) as unknown as MovieListRow[];
}

export default async function MoviesPage() {
  const movies = await getMovies();

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
            <p>TMDB에서 수집한 인기 영화를 최신 공개일 순으로 보여줍니다.</p>
          </div>
        </div>

        <div className="section" style={{ borderTop: 0, paddingTop: 0 }}>
          {movies.length === 0 ? (
            <p className="muted">아직 등록된 영화가 없습니다.</p>
          ) : (
            <div className="content-grid">
              {movies.map((movie) => (
                <Link key={movie.id} href={`/movies/${movie.id}`} className="content-card">
                  <div className={`content-thumb${movie.poster_url ? "" : " empty"}`}>
                    {movie.poster_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={movie.poster_url} alt={movie.canonical_title} />
                    ) : (
                      "No Image"
                    )}
                  </div>
                  <div>
                    <b style={{ display: "block", fontSize: 15 }}>{movie.canonical_title}</b>
                    <div className="sub">
                      {movie.release_date?.slice(0, 4) ?? "미정"}
                      {movie.content_genre.length > 0 && (
                        <>
                          {" "}
                          ·{" "}
                          {movie.content_genre
                            .map((cg) => cg.genre?.name)
                            .filter(Boolean)
                            .join(", ")}
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <SiteFooter
        title="모든 매체를 한곳에서"
        subtitle="영화, 드라마, 애니, 웹툰, 웹소설을 통합 검색하고 평가하세요."
      />
    </>
  );
}
