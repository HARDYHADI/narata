const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbMovieSummary {
  id: number;
  title: string;
}

export interface TmdbMovieDetails {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
  runtime: number | null;
  original_language: string;
  genres: TmdbGenre[];
  origin_country?: string[];
  status: string;
  poster_path: string | null;
  vote_average: number;
  vote_count: number;
}

export interface TmdbCastMember {
  name: string;
  order: number;
}

export interface TmdbCrewMember {
  name: string;
  job: string;
}

export interface TmdbCredits {
  cast: TmdbCastMember[];
  crew: TmdbCrewMember[];
}

export interface TmdbReleaseDateEntry {
  certification: string;
  type: number;
}

export interface TmdbReleaseDatesResult {
  iso_3166_1: string;
  release_dates: TmdbReleaseDateEntry[];
}

export interface TmdbReleaseDatesResponse {
  results: TmdbReleaseDatesResult[];
}

export const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

function getAuthHeaders(): HeadersInit {
  const token = process.env.TMDB_API_READ_ACCESS_TOKEN;

  if (!token) {
    throw new Error("Missing TMDB_API_READ_ACCESS_TOKEN environment variable");
  }

  return {
    Authorization: `Bearer ${token}`,
    accept: "application/json",
  };
}

async function tmdbFetch<T>(
  path: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  url.search = new URLSearchParams(params).toString();

  const res = await fetch(url, { headers: getAuthHeaders() });

  if (!res.ok) {
    throw new Error(`TMDB request failed: ${res.status} ${path}`);
  }

  return res.json() as Promise<T>;
}

export interface TmdbListPage {
  results: TmdbMovieSummary[];
  total_pages: number;
}

export type TmdbPageFetcher = (page: number) => Promise<TmdbListPage>;

export async function fetchPopularMovies(page = 1) {
  return tmdbFetch<TmdbListPage>("/movie/popular", {
    page: String(page),
    language: "ko-KR",
  });
}

/**
 * Movies sorted by TMDB vote_count (how "known" a title is), for bulk
 * backfills that want broad, meaningful coverage rather than just what's
 * currently popular. Paginated the same way as /movie/popular (20/page).
 */
export async function fetchMoviesByVoteCount(page = 1) {
  return tmdbFetch<TmdbListPage>("/discover/movie", {
    page: String(page),
    language: "ko-KR",
    sort_by: "vote_count.desc",
  });
}

export async function fetchMovieDetails(id: number) {
  return tmdbFetch<TmdbMovieDetails>(`/movie/${id}`, { language: "ko-KR" });
}

export async function fetchMovieCredits(id: number) {
  return tmdbFetch<TmdbCredits>(`/movie/${id}/credits`, { language: "ko-KR" });
}

export async function fetchMovieReleaseDates(id: number) {
  return tmdbFetch<TmdbReleaseDatesResponse>(`/movie/${id}/release_dates`);
}

export interface TmdbVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  published_at: string;
}

export interface TmdbVideosResponse {
  results: TmdbVideo[];
}

export async function fetchMovieVideos(id: number) {
  // TMDB filters /videos strictly by `language`, and most YouTube trailers are
  // tagged "en" rather than "ko" — include_video_language broadens the match
  // so we don't lose real videos while still preferring Korean-tagged ones.
  return tmdbFetch<TmdbVideosResponse>(`/movie/${id}/videos`, {
    language: "ko-KR",
    include_video_language: "ko,en,null",
  });
}

export interface TmdbWatchProviderEntry {
  provider_name: string;
  logo_path: string | null;
}

export interface TmdbWatchProviderRegion {
  link?: string;
  flatrate?: TmdbWatchProviderEntry[];
  rent?: TmdbWatchProviderEntry[];
  buy?: TmdbWatchProviderEntry[];
}

export interface TmdbWatchProvidersResponse {
  results: Record<string, TmdbWatchProviderRegion>;
}

export async function fetchMovieWatchProviders(id: number) {
  return tmdbFetch<TmdbWatchProvidersResponse>(`/movie/${id}/watch/providers`);
}

// --- TV (drama/anime) ---------------------------------------------------
// TMDB's TV shapes differ meaningfully from movies (name vs title, no single
// director, episode_run_time is an array, status values differ, etc.), so
// these get their own interfaces rather than reusing the movie ones.

export interface TmdbTvSummary {
  id: number;
  name: string;
}

export interface TmdbCreatedBy {
  id: number;
  name: string;
}

export interface TmdbTvShowDetails {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  first_air_date: string;
  number_of_episodes: number | null;
  episode_run_time: number[];
  original_language: string;
  genres: TmdbGenre[];
  origin_country?: string[];
  status: string;
  poster_path: string | null;
  vote_average: number;
  vote_count: number;
  created_by: TmdbCreatedBy[];
}

export interface TmdbTvListPage {
  results: TmdbTvSummary[];
  total_pages: number;
}

export type TmdbTvPageFetcher = (page: number) => Promise<TmdbTvListPage>;

export async function fetchPopularTvShows(page = 1) {
  return tmdbFetch<TmdbTvListPage>("/tv/popular", {
    page: String(page),
    language: "ko-KR",
  });
}

/**
 * TV shows sorted by TMDB vote_count, for bulk backfills that want broad,
 * meaningful coverage rather than just what's currently popular. Same
 * pagination shape as /tv/popular (20/page).
 */
export async function fetchTvShowsByVoteCount(page = 1) {
  return tmdbFetch<TmdbTvListPage>("/discover/tv", {
    page: String(page),
    language: "ko-KR",
    sort_by: "vote_count.desc",
  });
}

const TMDB_ANIMATION_GENRE_ID = "16";

/**
 * Same as fetchTvShowsByVoteCount, but restricted to TMDB's Animation genre
 * (id 16) — the same id the ingestion pipeline uses to classify a show as
 * ANIME. Lets a bulk backfill target anime specifically instead of pulling
 * from the general (drama-heavy by volume) top-TV-by-vote-count pool.
 */
export async function fetchAnimeByVoteCount(page = 1) {
  return tmdbFetch<TmdbTvListPage>("/discover/tv", {
    page: String(page),
    language: "ko-KR",
    sort_by: "vote_count.desc",
    with_genres: TMDB_ANIMATION_GENRE_ID,
  });
}

export async function fetchTvShowDetails(id: number) {
  return tmdbFetch<TmdbTvShowDetails>(`/tv/${id}`, { language: "ko-KR" });
}

export async function fetchTvShowCredits(id: number) {
  return tmdbFetch<TmdbCredits>(`/tv/${id}/credits`, { language: "ko-KR" });
}

export interface TmdbContentRatingEntry {
  iso_3166_1: string;
  rating: string;
}

export interface TmdbContentRatingsResponse {
  results: TmdbContentRatingEntry[];
}

export async function fetchTvShowContentRatings(id: number) {
  return tmdbFetch<TmdbContentRatingsResponse>(`/tv/${id}/content_ratings`);
}

export async function fetchTvShowVideos(id: number) {
  return tmdbFetch<TmdbVideosResponse>(`/tv/${id}/videos`, {
    language: "ko-KR",
    include_video_language: "ko,en,null",
  });
}

export async function fetchTvShowWatchProviders(id: number) {
  return tmdbFetch<TmdbWatchProvidersResponse>(`/tv/${id}/watch/providers`);
}
