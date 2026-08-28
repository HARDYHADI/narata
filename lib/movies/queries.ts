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
  director: string | null;
  cast_names: string[] | null;
  age_rating: string | null;
  content_genre: { genre: { name: string } | null }[];
}

const MOVIE_DETAIL_SELECT =
  "id, canonical_title, original_title, synopsis_short, release_date, status, country_code, original_language, runtime_minutes, poster_url, external_rating, external_rating_count, director, cast_names, age_rating, content_genre(genre(name))";

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
