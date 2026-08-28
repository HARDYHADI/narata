import { TMDB_IMAGE_BASE_URL, type TmdbMovieDetails } from "./client";

const TMDB_STATUS_TO_CONTENT_STATUS: Record<string, string> = {
  Rumored: "UPCOMING",
  Planned: "UPCOMING",
  "In Production": "UPCOMING",
  "Post Production": "UPCOMING",
  Released: "COMPLETED",
  Canceled: "CANCELLED",
};

export interface ContentRow {
  content_type: "MOVIE";
  canonical_title: string;
  original_title: string | null;
  synopsis_short: string | null;
  release_date: string | null;
  status: string;
  country_code: string | null;
  original_language: string | null;
  runtime_minutes: number | null;
  poster_url: string | null;
}

export function mapTmdbMovieToContent(movie: TmdbMovieDetails): ContentRow {
  return {
    content_type: "MOVIE",
    canonical_title: movie.title,
    original_title:
      movie.original_title && movie.original_title !== movie.title
        ? movie.original_title
        : null,
    synopsis_short: movie.overview || null,
    release_date: movie.release_date || null,
    status: TMDB_STATUS_TO_CONTENT_STATUS[movie.status] ?? "UNKNOWN",
    country_code: movie.origin_country?.[0] ?? null,
    original_language: movie.original_language ?? null,
    runtime_minutes: movie.runtime ?? null,
    poster_url: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : null,
  };
}
