import type { SupabaseClient } from "@supabase/supabase-js";

export const MOVIE_PAGE_SIZE = 24;

export interface MovieListItem {
  id: string;
  canonical_title: string;
  content_type: string;
  release_date: string | null;
  poster_url: string | null;
  average_rating: number;
  external_rating: number | null;
  content_genre: { genre: { name: string } | null }[];
}

const MOVIE_LIST_SELECT =
  "id, canonical_title, content_type, release_date, poster_url, average_rating, external_rating, content_genre(genre(name))";

export async function fetchMoviePage(
  supabase: SupabaseClient,
  page: number,
  contentType: string = "MOVIE"
): Promise<MovieListItem[]> {
  const from = page * MOVIE_PAGE_SIZE;
  const to = from + MOVIE_PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from("content")
    .select(MOVIE_LIST_SELECT)
    .eq("content_type", contentType)
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
  filters: MovieFilterParams = {},
  contentType: string = "MOVIE"
): Promise<MovieListItem[]> {
  const from = page * MOVIE_PAGE_SIZE;
  const to = from + MOVIE_PAGE_SIZE - 1;

  let query = supabase.from("content").select(MOVIE_LIST_SELECT).eq("content_type", contentType);

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
  limit: number,
  contentType: string = "MOVIE"
): Promise<MovieListItem[]> {
  const { data, error } = await supabase
    .from("content")
    .select(MOVIE_LIST_SELECT)
    .eq("content_type", contentType)
    .order("release_date", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("failed to load recent movies", error);
    return [];
  }

  return (data ?? []) as unknown as MovieListItem[];
}

// Used by the main homepage's "지금 가장 많이 보는 작품" strip, which spans
// multiple content types (unlike the rest of this module's MOVIE-only
// callers) — takes an explicit list of types rather than defaulting.
export async function fetchTopRatedContent(
  supabase: SupabaseClient,
  limit: number,
  contentTypes: string[]
): Promise<MovieListItem[]> {
  if (contentTypes.length === 0) return [];

  const { data, error } = await supabase
    .from("content")
    .select(MOVIE_LIST_SELECT)
    .in("content_type", contentTypes)
    .order("external_rating", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("failed to load top rated content", error);
    return [];
  }

  return (data ?? []) as unknown as MovieListItem[];
}

export interface MovieDetail {
  id: string;
  content_type: string;
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
  "id, content_type, canonical_title, original_title, synopsis_short, release_date, status, country_code, original_language, runtime_minutes, poster_url, external_rating, external_rating_count, average_rating, rating_count, director, cast_names, age_rating, content_genre(genre(name))";

// Fetches by id only — used by /movies/[id] which now doubles as the
// generic content detail page for DRAMA/ANIME too (see NOTE in that
// route), so this deliberately does NOT filter by content_type.
export async function fetchMovieDetail(
  supabase: SupabaseClient,
  id: string
): Promise<MovieDetail | null> {
  const { data, error } = await supabase
    .from("content")
    .select(MOVIE_DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("failed to load movie detail", error);
    return null;
  }

  return data as unknown as MovieDetail | null;
}

export interface ContentRelationItem {
  id: string;
  content_id: string;
  canonical_title: string;
  relation_type: string;
  confidence: number | null;
}

// content_relation rows can point at contentId from either side (it can be
// the source or the target of a relation), so this reads both directions
// and resolves the other side's title with a follow-up lookup rather than
// relying on PostgREST's dual-FK embed disambiguation for a table with two
// FKs to `content` — simpler to get right without live data to verify against.
export async function fetchContentRelations(
  supabase: SupabaseClient,
  contentId: string
): Promise<ContentRelationItem[]> {
  const [asSource, asTarget] = await Promise.all([
    supabase
      .from("content_relation")
      .select("id, relation_type, confidence, target_content_id")
      .eq("source_content_id", contentId)
      .eq("is_hidden", false),
    supabase
      .from("content_relation")
      .select("id, relation_type, confidence, source_content_id")
      .eq("target_content_id", contentId)
      .eq("is_hidden", false),
  ]);

  if (asSource.error) console.error("failed to load content relations (source)", asSource.error);
  if (asTarget.error) console.error("failed to load content relations (target)", asTarget.error);

  const pairs = [
    ...(asSource.data ?? []).map((row) => ({
      id: row.id as string,
      relation_type: row.relation_type as string,
      confidence: row.confidence as number | null,
      related_id: row.target_content_id as string,
    })),
    ...(asTarget.data ?? []).map((row) => ({
      id: row.id as string,
      relation_type: row.relation_type as string,
      confidence: row.confidence as number | null,
      related_id: row.source_content_id as string,
    })),
  ];

  if (pairs.length === 0) return [];

  const relatedIds = Array.from(new Set(pairs.map((p) => p.related_id)));
  const { data: relatedContent, error: relatedError } = await supabase
    .from("content")
    .select("id, canonical_title")
    .in("id", relatedIds);

  if (relatedError) {
    console.error("failed to load related content titles", relatedError);
    return [];
  }

  const titleById = new Map(
    (relatedContent ?? []).map((row) => [row.id as string, row.canonical_title as string])
  );

  return pairs
    .filter((p) => titleById.has(p.related_id))
    .map((p) => ({
      id: p.id,
      content_id: p.related_id,
      canonical_title: titleById.get(p.related_id)!,
      relation_type: p.relation_type,
      confidence: p.confidence,
    }));
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
  limit = 20,
  contentType: string = "MOVIE"
): Promise<MovieListItem[]> {
  const term = query.trim();
  if (!term) return [];

  const { data, error } = await supabase
    .from("content")
    .select(MOVIE_LIST_SELECT)
    .eq("content_type", contentType)
    .ilike("canonical_title", `%${term}%`)
    .order("release_date", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error("failed to search movies", error);
    return [];
  }

  return (data ?? []) as unknown as MovieListItem[];
}
