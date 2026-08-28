import {
  TMDB_IMAGE_BASE_URL,
  type TmdbCredits,
  type TmdbMovieDetails,
  type TmdbReleaseDatesResponse,
  type TmdbReleaseDatesResult,
} from "./client";

const TMDB_STATUS_TO_CONTENT_STATUS: Record<string, string> = {
  Rumored: "UPCOMING",
  Planned: "UPCOMING",
  "In Production": "UPCOMING",
  "Post Production": "UPCOMING",
  Released: "COMPLETED",
  Canceled: "CANCELLED",
};

const CAST_LIMIT = 6;

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
  external_rating: number | null;
  external_rating_count: number | null;
  director: string | null;
  cast_names: string[] | null;
  age_rating: string | null;
}

function extractDirector(credits: TmdbCredits): string | null {
  const directors = credits.crew
    .filter((member) => member.job === "Director")
    .map((member) => member.name);

  return directors.length > 0 ? directors.join(", ") : null;
}

function extractCastNames(credits: TmdbCredits): string[] | null {
  const names = [...credits.cast]
    .sort((a, b) => a.order - b.order)
    .slice(0, CAST_LIMIT)
    .map((member) => member.name);

  return names.length > 0 ? names : null;
}

function findCertification(
  results: TmdbReleaseDatesResult[],
  countryCode: string
): string | null {
  const entry = results.find((result) => result.iso_3166_1 === countryCode);
  const withCertification = entry?.release_dates.find(
    (release) => release.certification.trim() !== ""
  );

  return withCertification?.certification ?? null;
}

function extractAgeRating(releaseDates: TmdbReleaseDatesResponse): string | null {
  return (
    findCertification(releaseDates.results, "KR") ??
    findCertification(releaseDates.results, "US")
  );
}

export function mapTmdbMovieToContent(
  movie: TmdbMovieDetails,
  credits: TmdbCredits,
  releaseDates: TmdbReleaseDatesResponse
): ContentRow {
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
    external_rating: movie.vote_count > 0 ? movie.vote_average : null,
    external_rating_count: movie.vote_count > 0 ? movie.vote_count : null,
    director: extractDirector(credits),
    cast_names: extractCastNames(credits),
    age_rating: extractAgeRating(releaseDates),
  };
}
