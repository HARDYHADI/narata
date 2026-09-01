import {
  TMDB_IMAGE_BASE_URL,
  type TmdbContentRatingsResponse,
  type TmdbCredits,
  type TmdbTvShowDetails,
} from "./client";

// TMDB's stable Animation genre id. Checked numerically rather than by
// matching the (localized, ko-KR) genre name string, which is fragile.
const TMDB_ANIMATION_GENRE_ID = 16;

const TMDB_TV_STATUS_TO_CONTENT_STATUS: Record<string, string> = {
  "Returning Series": "ONGOING",
  "In Production": "ONGOING",
  Pilot: "ONGOING",
  Planned: "UPCOMING",
  Ended: "COMPLETED",
  Canceled: "CANCELLED",
};

const CAST_LIMIT = 6;

export interface TvContentRow {
  content_type: "DRAMA" | "ANIME";
  canonical_title: string;
  original_title: string | null;
  synopsis_short: string | null;
  release_date: string | null;
  status: string;
  country_code: string | null;
  original_language: string | null;
  runtime_minutes: number | null;
  episode_count: number | null;
  poster_url: string | null;
  external_rating: number | null;
  external_rating_count: number | null;
  director: string | null;
  cast_names: string[] | null;
  age_rating: string | null;
}

function extractCreatedByNames(tv: TmdbTvShowDetails): string | null {
  const names = tv.created_by.map((c) => c.name);
  return names.length > 0 ? names.join(", ") : null;
}

function extractCastNames(credits: TmdbCredits): string[] | null {
  const names = [...credits.cast]
    .sort((a, b) => a.order - b.order)
    .slice(0, CAST_LIMIT)
    .map((member) => member.name);

  return names.length > 0 ? names : null;
}

function findTvCertification(
  results: { iso_3166_1: string; rating: string }[],
  countryCode: string
): string | null {
  const entry = results.find(
    (result) => result.iso_3166_1 === countryCode && result.rating.trim() !== ""
  );
  return entry?.rating ?? null;
}

function extractTvAgeRating(contentRatings: TmdbContentRatingsResponse): string | null {
  return (
    findTvCertification(contentRatings.results, "KR") ??
    findTvCertification(contentRatings.results, "US")
  );
}

function classifyTvContentType(tv: TmdbTvShowDetails): "DRAMA" | "ANIME" {
  const isAnimation = tv.genres.some((g) => g.id === TMDB_ANIMATION_GENRE_ID);
  return isAnimation ? "ANIME" : "DRAMA";
}

export function mapTmdbTvToContent(
  tv: TmdbTvShowDetails,
  credits: TmdbCredits,
  contentRatings: TmdbContentRatingsResponse
): TvContentRow {
  return {
    content_type: classifyTvContentType(tv),
    canonical_title: tv.name,
    original_title: tv.original_name && tv.original_name !== tv.name ? tv.original_name : null,
    synopsis_short: tv.overview || null,
    release_date: tv.first_air_date || null,
    status: TMDB_TV_STATUS_TO_CONTENT_STATUS[tv.status] ?? "UNKNOWN",
    country_code: tv.origin_country?.[0] ?? null,
    original_language: tv.original_language ?? null,
    runtime_minutes: tv.episode_run_time.length > 0 ? tv.episode_run_time[0] : null,
    episode_count: tv.number_of_episodes ?? null,
    poster_url: tv.poster_path ? `${TMDB_IMAGE_BASE_URL}${tv.poster_path}` : null,
    external_rating: tv.vote_count > 0 ? tv.vote_average : null,
    external_rating_count: tv.vote_count > 0 ? tv.vote_count : null,
    director: extractCreatedByNames(tv),
    cast_names: extractCastNames(credits),
    age_rating: extractTvAgeRating(contentRatings),
  };
}
