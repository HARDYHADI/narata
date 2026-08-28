import Link from "next/link";
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
    <main className="movies-page">
      <h1>영화</h1>
      {movies.length === 0 ? (
        <p className="empty">아직 등록된 영화가 없습니다.</p>
      ) : (
        <div className="movie-grid">
          {movies.map((movie) => (
            <Link key={movie.id} href={`/movies/${movie.id}`} className="movie-card">
              <div className="poster">
                {movie.poster_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={movie.poster_url} alt={movie.canonical_title} />
                ) : (
                  <div className="poster-placeholder">No Image</div>
                )}
              </div>
              <div className="title">{movie.canonical_title}</div>
              <div className="meta">
                {movie.release_date?.slice(0, 4) ?? "미정"}
                {movie.content_genre.length > 0 && (
                  <> · {movie.content_genre.map((cg) => cg.genre?.name).filter(Boolean).join(", ")}</>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
