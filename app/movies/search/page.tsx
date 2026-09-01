import Link from "next/link";
import SiteHeader from "@/components/site-header";
import MovieBar from "@/components/movie-bar";
import AuthStatus from "@/components/auth-status";
import { getSupabaseClient } from "@/lib/supabase/client";
import { searchMovies } from "@/lib/movies/queries";

// NOTE: the AI-find sidebar prompt and "연관 검색어" are static sample
// content — there's no query-suggestion or AI-search backend yet.
const RELATED = ["바다 영화", "섬 미스터리", "재난 영화", "감독으로 찾기"];

export default async function MovieSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const supabase = getSupabaseClient();
  const results = supabase && query ? await searchMovies(supabase, query) : [];

  return (
    <>
      <SiteHeader active="content" actions={<AuthStatus />} />
      <MovieBar active="browse" />

      <div className="wrap">
        <div className="search-hero">
          <span className="eyebrow">MOVIE SEARCH</span>
          <h1 style={{ fontSize: 39, margin: "7px 0 20px" }}>영화 검색</h1>
          <form action="/movies/search" className="big-search">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="제목으로 검색해보세요"
              style={{
                flex: 1,
                border: "none",
                background: "transparent",
                font: "inherit",
                color: "inherit",
                outline: "none",
              }}
            />
            <button type="submit" className="btn" style={{ height: 34 }}>
              ⌕
            </button>
          </form>
        </div>

        <div className="search-layout">
          <div className="card">
            <div style={{ padding: 21 }}>
              {query ? (
                <b>‘{query}’ 검색 결과 {results.length}편</b>
              ) : (
                <b>검색어를 입력해보세요</b>
              )}
            </div>
            {query && results.length === 0 && (
              <p className="muted" style={{ padding: "0 21px 21px" }}>
                일치하는 영화를 찾지 못했어요.
              </p>
            )}
            {results.map((movie) => (
              <Link key={movie.id} href={`/movies/${movie.id}`} className="search-item">
                <div className="sm-cover">
                  {movie.poster_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={movie.poster_url}
                      alt={movie.canonical_title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    movie.canonical_title
                  )}
                </div>
                <div>
                  <span className="pill">영화 · {movie.release_date?.slice(0, 4) ?? "미정"}</span>
                  <h3>{movie.canonical_title}</h3>
                  {movie.content_genre.length > 0 && (
                    <p className="sub">
                      {movie.content_genre.map((cg) => cg.genre?.name).filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
                <div className="score">
                  <strong className="stars">
                    {movie.external_rating != null ? `★ ${movie.external_rating.toFixed(1)}` : "-"}
                  </strong>
                </div>
              </Link>
            ))}
          </div>

          <aside className="side">
            <div className="card ai-box">
              <span className="pill orange">NARATA AI</span>
              <h2 style={{ fontSize: 23, margin: "12px 0 5px" }}>찾는 영화가 안 보이나요?</h2>
              <p>제목이 아니라 기억나는 장면과 분위기로도 찾을 수 있어요.</p>
              <div className="prompt">“밤바다에서 라디오 신호를 듣는 영화였어…”</div>
              <Link href="/ai" className="btn orange" style={{ width: "100%", textAlign: "center" }}>
                AI로 영화 찾기
              </Link>
            </div>
            <div className="card sidebox">
              <h3>연관 검색어</h3>
              <div className="gallery">
                {RELATED.map((tag) => (
                  <span key={tag} className="pill">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
