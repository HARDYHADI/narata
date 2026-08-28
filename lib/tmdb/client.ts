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

export async function fetchPopularMovies(page = 1) {
  return tmdbFetch<{ results: TmdbMovieSummary[]; total_pages: number }>(
    "/movie/popular",
    { page: String(page), language: "ko-KR" }
  );
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
