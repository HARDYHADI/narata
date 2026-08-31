import type { SupabaseClient } from "@supabase/supabase-js";

export const MOVIE_PAGE_SIZE = 24;

export interface MovieListItem {
  id: string;
  canonical_title: string;
  release_date: string | null;
  poster_url: string | null;
  average_rating: number;
  external_rating: number | null;
  content_genre: { genre: { name: string } | null }[];
}

const MOVIE_LIST_SELECT =
  "id, canonical_title, release_date, poster_url, average_rating, external_rating, content_genre(genre(name))";

export async function fetchMoviePage(
  supabase: SupabaseClient,
  page: number
): Promise<MovieListItem[]> {
  const from = page * MOVIE_PAGE_SIZE;
  const to = from + MOVIE_PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from("content")
    .select(MOVIE_LIST_SELECT)
    .eq("content_type", "MOVIE")
    .order("release_date", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("failed to load movies", error);
    return [];
  }

  return (data ?? []) as unknown as MovieListItem[];
}

export interface Genre {
  id: string;
  name: string;
}

export async function fetchGenres(supabase: SupabaseClient): Promise<Genre[]> {
  const { data, error } = await supabase.from("genre").select("id, name").order("name");

  if (error) {
    console.error("failed to load genres", error);
    return [];
  }

  return (data ?? []) as Genre[];
}

export type MovieSortOption = "latest" | "rating" | "popularity";

export interface MovieFilterParams {
  genreIds?: string[];
  countries?: string[];
  statuses?: string[];
  yearFrom?: number;
  yearTo?: number;
  maxRuntime?: number;
  sort?: MovieSortOption;
}

async function resolveGenreContentIds(
  supabase: SupabaseClient,
  genreIds: string[]
): Promise<string[]> {
  const { data, error } = await supabase
    .from("content_genre")
    .select("content_id")
    .in("genre_id", genreIds);

  if (error) {
    console.error("failed to resolve genre filter", error);
    return [];
  }

  return Array.from(new Set((data ?? []).map((row) => row.content_id as string)));
}

export async function fetchFilteredMoviePage(
  supabase: SupabaseClient,
  page: number,
  filters: MovieFilterParams = {}
): Promise<MovieListItem[]> {
  const from = page * MOVIE_PAGE_SIZE;
  const to = from + MOVIE_PAGE_SIZE - 1;

  let query = supabase.from("content").select(MOVIE_LIST_SELECT).eq("content_type", "MOVIE");

  if (filters.genreIds && filters.genreIds.length > 0) {
    const contentIds = await resolveGenreContentIds(supabase, filters.genreIds);
    if (contentIds.length === 0) return [];
    query = query.in("id", contentIds);
  }
  if (filters.countries && filters.countries.length > 0) {
    query = query.in("country_code", filters.countries);
  }
  if (filters.statuses && filters.statuses.length > 0) {
    query = query.in("status", filters.statuses);
  }
  if (filters.yearFrom) {
    query = query.gte("release_date", `${filters.yearFrom}-01-01`);
  }
  if (filters.yearTo) {
    query = query.lte("release_date", `${filters.yearTo}-12-31`);
  }
  if (filters.maxRuntime) {
    query = query.lte("runtime_minutes", filters.maxRuntime);
  }

  if (filters.sort === "rating") {
    query = query.order("external_rating", { ascending: false, nullsFirst: false });
  } else if (filters.sort === "popularity") {
    query = query.order("external_rating_count", { ascending: false, nullsFirst: false });
  } else {
    query = query.order("release_date", { ascending: false, nullsFirst: false });
  }
  query = query.order("id", { ascending: false }).range(from, to);

  const { data, error } = await query;

  if (error) {
    console.error("failed to load filtered movies", error);
    return [];
  }

  return (data ?? []) as unknown as MovieListItem[];
}

export async function fetchRecentMovies(
  supabase: SupabaseClient,
  limit: number
): Promise<MovieListItem[]> {
  const { data, error } = await supabase
    .from("content")
    .select(MOVIE_LIST_SELECT)
    .eq("content_type", "MOVIE")
    .order("release_date", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("failed to load recent movies", error);
    return [];
  }

  return (data ?? []) as unknown as MovieListItem[];
}

export interface MovieDetail {
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
  external_rating: number | null;
  external_rating_count: number | null;
  average_rating: number;
  rating_count: number;
  director: string | null;
  cast_names: string[] | null;
  age_rating: string | null;
  content_genre: { genre: { name: string } | null }[];
}

const MOVIE_DETAIL_SELECT =
  "id, canonical_title, original_title, synopsis_short, release_date, status, country_code, original_language, runtime_minutes, poster_url, external_rating, external_rating_count, average_rating, rating_count, director, cast_names, age_rating, content_genre(genre(name))";

export async function fetchMovieDetail(
  supabase: SupabaseClient,
  id: string
): Promise<MovieDetail | null> {
  const { data, error } = await supabase
    .from("content")
    .select(MOVIE_DETAIL_SELECT)
    .eq("id", id)
    .eq("content_type", "MOVIE")
    .maybeSingle();

  if (error) {
    console.error("failed to load movie detail", error);
    return null;
  }

  return data as unknown as MovieDetail | null;
}

export async function fetchMoviesByIds(
  supabase: SupabaseClient,
  ids: string[]
): Promise<MovieListItem[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("content")
    .select(MOVIE_LIST_SELECT)
    .in("id", ids);

  if (error) {
    console.error("failed to load movies by id", error);
    return [];
  }

  return (data ?? []) as unknown as MovieListItem[];
}

export interface AiCandidateMovie {
  id: string;
  canonical_title: string;
  release_date: string | null;
  poster_url: string | null;
  synopsis_short: string | null;
  director: string | null;
  cast_names: string[] | null;
  content_genre: { genre: { name: string } | null }[];
}

const AI_CANDIDATE_SELECT =
  "id, canonical_title, release_date, poster_url, synopsis_short, director, cast_names, content_genre(genre(name))";

export async function fetchAiCandidateMovies(
  supabase: SupabaseClient,
  ids: string[]
): Promise<AiCandidateMovie[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("content")
    .select(AI_CANDIDATE_SELECT)
    .in("id", ids);

  if (error) {
    console.error("failed to load AI candidate movies", error);
    return [];
  }

  return (data ?? []) as unknown as AiCandidateMovie[];
}

export async function searchMovies(
  supabase: SupabaseClient,
  query: string,
  limit = 20
): Promise<MovieListItem[]> {
  const term = query.trim();
  if (!term) return [];

  const { data, error } = await supabase
    .from("content")
    .select(MOVIE_LIST_SELECT)
    .eq("content_type", "MOVIE")
    .ilike("canonical_title", `%${term}%`)
    .order("release_date", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error("failed to search movies", error);
    return [];
  }

  return (data ?? []) as unknown as MovieListItem[];
}
