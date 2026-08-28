import type { SupabaseClient } from "@supabase/supabase-js";

export const MOVIE_PAGE_SIZE = 24;

export interface MovieListItem {
  id: string;
  canonical_title: string;
  release_date: string | null;
  poster_url: string | null;
  average_rating: number;
  content_genre: { genre: { name: string } | null }[];
}

const MOVIE_LIST_SELECT =
  "id, canonical_title, release_date, poster_url, average_rating, content_genre(genre(name))";

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
