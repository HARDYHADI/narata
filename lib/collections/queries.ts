import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchMoviesByIds, type MovieListItem } from "@/lib/movies/queries";

export interface MutationResult {
  success: boolean;
  error?: string;
}

export interface ToggleResult extends MutationResult {
  active: boolean;
}

export async function isInWatchlist(
  supabase: SupabaseClient,
  contentId: string
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("watchlist_item")
    .select("content_id")
    .eq("content_id", contentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("failed to check watchlist status", error);
    return false;
  }

  return Boolean(data);
}

export async function toggleWatchlist(
  supabase: SupabaseClient,
  contentId: string
): Promise<ToggleResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not_authenticated", active: false };

  const { data: existing, error: selectError } = await supabase
    .from("watchlist_item")
    .select("content_id")
    .eq("content_id", contentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (selectError) {
    console.error("failed to check watchlist status", selectError);
    return { success: false, error: selectError.message, active: false };
  }

  if (existing) {
    const { error } = await supabase
      .from("watchlist_item")
      .delete()
      .eq("content_id", contentId)
      .eq("user_id", user.id);

    if (error) {
      console.error("failed to remove watchlist item", error);
      return { success: false, error: error.message, active: true };
    }
    return { success: true, active: false };
  }

  const { error } = await supabase
    .from("watchlist_item")
    .insert({ content_id: contentId, user_id: user.id });

  if (error) {
    console.error("failed to add watchlist item", error);
    return { success: false, error: error.message, active: false };
  }
  return { success: true, active: true };
}

export async function fetchWatchlistMovies(
  supabase: SupabaseClient
): Promise<MovieListItem[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("watchlist_item")
    .select("content_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("failed to load watchlist", error);
    return [];
  }

  const contentIds = (data ?? []).map((row) => row.content_id as string);
  if (contentIds.length === 0) return [];

  const movies = await fetchMoviesByIds(supabase, contentIds);
  // preserve the watchlist's most-recently-added-first order
  const order = new Map(contentIds.map((id, i) => [id, i]));
  return [...movies].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  item_count: number;
}

export async function fetchMyCollections(
  supabase: SupabaseClient
): Promise<Collection[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("collection")
    .select("id, name, description, is_public, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("failed to load my collections", error);
    return [];
  }

  const collections = (data ?? []) as Omit<Collection, "item_count">[];
  if (collections.length === 0) return [];

  const { data: itemRows, error: itemsError } = await supabase
    .from("collection_item")
    .select("collection_id")
    .in(
      "collection_id",
      collections.map((c) => c.id)
    );

  if (itemsError) console.error("failed to load collection item counts", itemsError);

  const counts = new Map<string, number>();
  for (const row of itemRows ?? []) {
    const id = row.collection_id as string;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  return collections.map((c) => ({ ...c, item_count: counts.get(c.id) ?? 0 }));
}

export interface CreateCollectionResult extends MutationResult {
  collection?: Collection;
}

export async function createCollection(
  supabase: SupabaseClient,
  name: string,
  description?: string,
  isPublic: boolean = true
): Promise<CreateCollectionResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not_authenticated" };

  const trimmedName = name.trim();
  if (!trimmedName) return { success: false, error: "name_required" };

  const { data, error } = await supabase
    .from("collection")
    .insert({
      user_id: user.id,
      name: trimmedName,
      description: description?.trim() || null,
      is_public: isPublic,
    })
    .select("id, name, description, is_public, created_at")
    .single();

  if (error) {
    console.error("failed to create collection", error);
    return { success: false, error: error.message };
  }

  return { success: true, collection: { ...(data as Omit<Collection, "item_count">), item_count: 0 } };
}

export interface CollectionItem {
  content_id: string;
  note: string | null;
  added_at: string;
  movie: MovieListItem | null;
}

export interface CollectionDetail extends Collection {
  user_id: string;
  items: CollectionItem[];
}

export async function fetchCollection(
  supabase: SupabaseClient,
  collectionId: string
): Promise<CollectionDetail | null> {
  const { data: collection, error: collectionError } = await supabase
    .from("collection")
    .select("id, user_id, name, description, is_public, created_at")
    .eq("id", collectionId)
    .maybeSingle();

  if (collectionError) {
    console.error("failed to load collection", collectionError);
    return null;
  }
  if (!collection) return null;

  const { data: items, error: itemsError } = await supabase
    .from("collection_item")
    .select("content_id, note, added_at")
    .eq("collection_id", collectionId)
    .order("added_at", { ascending: false });

  if (itemsError) {
    console.error("failed to load collection items", itemsError);
    return { ...(collection as Omit<CollectionDetail, "item_count" | "items">), item_count: 0, items: [] };
  }

  const rows = (items ?? []) as { content_id: string; note: string | null; added_at: string }[];
  const movies = await fetchMoviesByIds(
    supabase,
    rows.map((row) => row.content_id)
  );
  const movieById = new Map(movies.map((movie) => [movie.id, movie]));

  return {
    ...(collection as Omit<CollectionDetail, "item_count" | "items">),
    item_count: rows.length,
    items: rows.map((row) => ({
      content_id: row.content_id,
      note: row.note,
      added_at: row.added_at,
      movie: movieById.get(row.content_id) ?? null,
    })),
  };
}

export async function addToCollection(
  supabase: SupabaseClient,
  collectionId: string,
  contentId: string,
  note?: string
): Promise<MutationResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not_authenticated" };

  const { error } = await supabase
    .from("collection_item")
    .upsert(
      { collection_id: collectionId, content_id: contentId, note: note?.trim() || null },
      { onConflict: "collection_id,content_id" }
    );

  if (error) {
    console.error("failed to add item to collection", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function removeFromCollection(
  supabase: SupabaseClient,
  collectionId: string,
  contentId: string
): Promise<MutationResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not_authenticated" };

  const { error } = await supabase
    .from("collection_item")
    .delete()
    .eq("collection_id", collectionId)
    .eq("content_id", contentId);

  if (error) {
    console.error("failed to remove item from collection", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
