import { notFound } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";

export const revalidate = 60;

interface MovieDetailRow {
  id: string;
  canonical_title: string;
  original_title: string | null;
  synopsis_short: string | null;
  release_date: string | null;
  status: string;
  country_code: string | null;
  original_language: string | null;
  runtime_minutes: number | null;
  poster_url: string | null;
  average_rating: number;
  content_genre: { genre: { name: string } | null }[];
}

async function getMovie(id: string): Promise<MovieDetailRow | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("content")
    .select(
      "id, canonical_title, original_title, synopsis_short, release_date, status, country_code, original_language, runtime_minutes, poster_url, average_rating, content_genre(genre(name))"
    )
    .eq("id", id)
    .eq("content_type", "MOVIE")
    .maybeSingle();

  if (error) {
    console.error("failed to load movie", error);
    return null;
  }

  return data as unknown as MovieDetailRow | null;
}

export default async function MovieDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const movie = await getMovie(id);

  if (!movie) notFound();

  const genreNames = movie.content_genre.map((cg) => cg.genre?.name).filter(Boolean);

  return (
    <main className="movie-detail">
      <div className="poster">
        {movie.poster_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={movie.poster_url} alt={movie.canonical_title} />
        ) : (
          <div className="poster-placeholder">No Image</div>
        )}
      </div>
      <div className="info">
        <h1>{movie.canonical_title}</h1>
        {movie.original_title && <p className="original-title">{movie.original_title}</p>}
        <p className="meta">
          {movie.release_date ?? "공개일 미정"}
          {movie.runtime_minutes ? ` · ${movie.runtime_minutes}분` : ""}
          {movie.country_code ? ` · ${movie.country_code}` : ""}
        </p>
        {genreNames.length > 0 && <p className="genres">{genreNames.join(", ")}</p>}
        {movie.synopsis_short && <p className="synopsis">{movie.synopsis_short}</p>}
      </div>
    </main>
  );
}
