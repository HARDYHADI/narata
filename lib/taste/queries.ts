import type { SupabaseClient } from "@supabase/supabase-js";

export interface MutationResult {
  success: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

export interface UserPreference {
  exclude_watched: boolean;
  limit_franchise_repeats: boolean;
  use_community_activity: boolean;
  include_adult: boolean;
}

export const DEFAULT_PREFERENCES: UserPreference = {
  exclude_watched: true,
  limit_franchise_repeats: true,
  use_community_activity: true,
  include_adult: false,
};

export async function fetchMyPreferences(supabase: SupabaseClient): Promise<UserPreference> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return DEFAULT_PREFERENCES;

  const { data, error } = await supabase
    .from("user_preference")
    .select("exclude_watched, limit_franchise_repeats, use_community_activity, include_adult")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("failed to load preferences", error);
    return DEFAULT_PREFERENCES;
  }

  return (data as UserPreference | null) ?? DEFAULT_PREFERENCES;
}

export async function upsertPreferences(
  supabase: SupabaseClient,
  prefs: Partial<UserPreference>
): Promise<MutationResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not_authenticated" };

  const { error } = await supabase
    .from("user_preference")
    .upsert(
      { user_id: user.id, ...prefs, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

  if (error) {
    console.error("failed to save preferences", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// Profile stats
// ---------------------------------------------------------------------------

export interface TasteStats {
  ratingCount: number;
  reviewCount: number;
  collectionCount: number;
  averageScore: number;
}

const EMPTY_STATS: TasteStats = {
  ratingCount: 0,
  reviewCount: 0,
  collectionCount: 0,
  averageScore: 0,
};

export async function fetchMyStats(supabase: SupabaseClient): Promise<TasteStats> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return EMPTY_STATS;

  const [ratingsResult, reviewsResult, scoresResult] = await Promise.all([
    supabase.from("content_rating").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("review").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("content_rating").select("score").eq("user_id", user.id),
  ]);

  if (ratingsResult.error) console.error("failed to count ratings", ratingsResult.error);
  if (reviewsResult.error) console.error("failed to count reviews", reviewsResult.error);
  if (scoresResult.error) console.error("failed to load scores for average", scoresResult.error);

  // `collection` is landed by a sibling agent in parallel; fall back to 0
  // rather than failing the whole stats block if it isn't queryable yet.
  let collectionCount = 0;
  try {
    const collectionResult = await supabase
      .from("collection")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if (collectionResult.error) throw collectionResult.error;
    collectionCount = collectionResult.count ?? 0;
  } catch (err) {
    console.error("failed to count collections", err);
    collectionCount = 0;
  }

  const scores = (scoresResult.data ?? []).map((row) => Number(row.score));
  const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  return {
    ratingCount: ratingsResult.count ?? 0,
    reviewCount: reviewsResult.count ?? 0,
    collectionCount,
    averageScore,
  };
}

// ---------------------------------------------------------------------------
// Recent activity
// ---------------------------------------------------------------------------

export interface RecentActivityItem {
  id: string;
  score: number;
  created_at: string;
  content_id: string;
  title: string;
  content_type: string;
  review_body: string | null;
}

interface RecentActivityRow {
  id: string;
  score: number;
  created_at: string;
  content_id: string;
  content: { canonical_title: string; content_type: string } | null;
  review: { body: string } | null;
}

const RECENT_ACTIVITY_SELECT =
  "id, score, created_at, content_id, content(canonical_title, content_type), review(body)";

export async function fetchMyRecentActivity(
  supabase: SupabaseClient,
  limit: number
): Promise<RecentActivityItem[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("content_rating")
    .select(RECENT_ACTIVITY_SELECT)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("failed to load recent activity", error);
    return [];
  }

  return ((data ?? []) as unknown as RecentActivityRow[]).map((row) => ({
    id: row.id,
    score: Number(row.score),
    created_at: row.created_at,
    content_id: row.content_id,
    title: row.content?.canonical_title ?? "알 수 없는 작품",
    content_type: row.content?.content_type ?? "MOVIE",
    review_body: row.review?.body ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Taste tags ("좋아하는 요소" / "줄일 요소")
// ---------------------------------------------------------------------------

export interface TasteTag {
  tag_id: string;
  label: string;
  category: string;
  kind: string;
  count: number;
  emphasized: boolean;
}

export interface TasteTags {
  liked: TasteTag[];
  avoid: TasteTag[];
}

const EMPTY_TASTE_TAGS: TasteTags = { liked: [], avoid: [] };

const LIKED_SCORE_THRESHOLD = 4;
const AVOID_SCORE_THRESHOLD = 2.5;
const MAX_TAGS_PER_SIDE = 10;
const EMPHASIZED_RANK = 3;

interface TagVoteRow {
  content_id: string;
  tag_id: string;
  content_tag: { name: string; category: string; kind: string } | null;
}

function rankTags(
  contentIds: Set<string>,
  votes: TagVoteRow[]
): TasteTag[] {
  const counts = new Map<string, { label: string; category: string; kind: string; count: number }>();

  for (const vote of votes) {
    if (!contentIds.has(vote.content_id) || !vote.content_tag) continue;
    const entry = counts.get(vote.tag_id) ?? {
      label: vote.content_tag.name,
      category: vote.content_tag.category,
      kind: vote.content_tag.kind,
      count: 0,
    };
    entry.count += 1;
    counts.set(vote.tag_id, entry);
  }

  return Array.from(counts.entries())
    .map(([tag_id, entry]) => ({ tag_id, ...entry, emphasized: false }))
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_TAGS_PER_SIDE)
    .map((tag, i) => ({ ...tag, emphasized: i < EMPHASIZED_RANK }));
}

// Heuristic: "좋아하는 요소" comes from tags the user themselves voted on for
// content they rated >= 4; "줄일 요소" comes from tags they voted on for
// content they rated <= 2.5. Tag category/kind (MOOD/CONTENT_ADVISORY,
// POSITIVE/NEGATIVE) isn't filtered on directly — a user's own vote on a
// highly-rated work is already a strong positive signal regardless of the
// tag's declared kind, and vice versa for low-rated work.
export async function fetchTasteTags(supabase: SupabaseClient): Promise<TasteTags> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return EMPTY_TASTE_TAGS;

  const { data: ratings, error: ratingsError } = await supabase
    .from("content_rating")
    .select("content_id, score")
    .eq("user_id", user.id);

  if (ratingsError) {
    console.error("failed to load ratings for taste tags", ratingsError);
    return EMPTY_TASTE_TAGS;
  }

  const likedIds = new Set<string>();
  const avoidIds = new Set<string>();
  for (const row of ratings ?? []) {
    const score = Number(row.score);
    if (score >= LIKED_SCORE_THRESHOLD) likedIds.add(row.content_id as string);
    else if (score <= AVOID_SCORE_THRESHOLD) avoidIds.add(row.content_id as string);
  }

  const relevantContentIds = Array.from(new Set([...likedIds, ...avoidIds]));
  if (relevantContentIds.length === 0) return EMPTY_TASTE_TAGS;

  const { data: votes, error: votesError } = await supabase
    .from("content_tag_vote")
    .select("content_id, tag_id, content_tag(name, category, kind)")
    .eq("user_id", user.id)
    .in("content_id", relevantContentIds);

  if (votesError) {
    console.error("failed to load tag votes for taste tags", votesError);
    return EMPTY_TASTE_TAGS;
  }

  const voteRows = (votes ?? []) as unknown as TagVoteRow[];

  return {
    liked: rankTags(likedIds, voteRows),
    avoid: rankTags(avoidIds, voteRows),
  };
}

// ---------------------------------------------------------------------------
// Homepage recommendations
// ---------------------------------------------------------------------------

export interface HomeRecommendation {
  id: string;
  title: string;
  content_type: string;
  genre_name: string | null;
  external_rating: number | null;
  poster_url: string | null;
}

export interface HomeRecommendations {
  personalized: boolean;
  items: HomeRecommendation[];
}

const EMPTY_HOME_RECOMMENDATIONS: HomeRecommendations = { personalized: false, items: [] };
const HOME_REC_CONTENT_TYPES = ["MOVIE", "DRAMA", "ANIME"];

interface HomeRecCandidateRow {
  id: string;
  canonical_title: string;
  content_type: string;
  external_rating: number | null;
  poster_url: string | null;
  content_genre: { genre: { name: string } | null }[];
}

const HOME_REC_CANDIDATE_SELECT =
  "id, canonical_title, content_type, external_rating, poster_url, content_genre(genre(name))";

function toHomeRecommendation(row: HomeRecCandidateRow): HomeRecommendation {
  return {
    id: row.id,
    title: row.canonical_title,
    content_type: row.content_type,
    genre_name: row.content_genre[0]?.genre?.name ?? null,
    external_rating: row.external_rating,
    poster_url: row.poster_url,
  };
}

async function fetchPopularFallback(
  supabase: SupabaseClient,
  limit: number
): Promise<HomeRecommendations> {
  const { data, error } = await supabase
    .from("content")
    .select(HOME_REC_CANDIDATE_SELECT)
    .in("content_type", HOME_REC_CONTENT_TYPES)
    .order("external_rating", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error("failed to load popular fallback for home recommendations", error);
    return EMPTY_HOME_RECOMMENDATIONS;
  }

  return {
    personalized: false,
    items: ((data ?? []) as unknown as HomeRecCandidateRow[]).map(toHomeRecommendation),
  };
}

// Heuristic, not a real recommender: take the genres of content the user
// rated >= 4, then surface other well-rated content sharing those genres
// that they haven't rated yet. Falls back to site-wide popular content when
// logged out or when there's no rating signal to work from yet (expected
// for most users right now, since login only just shipped).
export async function fetchHomeRecommendations(
  supabase: SupabaseClient,
  limit = 3
): Promise<HomeRecommendations> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return fetchPopularFallback(supabase, limit);

  const { data: ratings, error: ratingsError } = await supabase
    .from("content_rating")
    .select("content_id")
    .eq("user_id", user.id)
    .gte("score", LIKED_SCORE_THRESHOLD);

  if (ratingsError) console.error("failed to load ratings for home recommendations", ratingsError);

  const likedIds = (ratings ?? []).map((row) => row.content_id as string);
  if (likedIds.length === 0) return fetchPopularFallback(supabase, limit);

  const { data: likedGenreLinks, error: likedGenreError } = await supabase
    .from("content_genre")
    .select("genre_id")
    .in("content_id", likedIds);

  if (likedGenreError) {
    console.error("failed to load liked genres for home recommendations", likedGenreError);
    return fetchPopularFallback(supabase, limit);
  }

  const genreCounts = new Map<string, number>();
  for (const row of likedGenreLinks ?? []) {
    const genreId = row.genre_id as string;
    genreCounts.set(genreId, (genreCounts.get(genreId) ?? 0) + 1);
  }

  const topGenreIds = Array.from(genreCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([genreId]) => genreId);

  if (topGenreIds.length === 0) return fetchPopularFallback(supabase, limit);

  const { data: candidateLinks, error: candidateError } = await supabase
    .from("content_genre")
    .select("content_id")
    .in("genre_id", topGenreIds);

  if (candidateError) {
    console.error("failed to load candidate content for home recommendations", candidateError);
    return fetchPopularFallback(supabase, limit);
  }

  const likedIdSet = new Set(likedIds);
  const candidateIds = Array.from(
    new Set((candidateLinks ?? []).map((row) => row.content_id as string))
  ).filter((id) => !likedIdSet.has(id));

  if (candidateIds.length === 0) return fetchPopularFallback(supabase, limit);

  const { data: recs, error: recsError } = await supabase
    .from("content")
    .select(HOME_REC_CANDIDATE_SELECT)
    .in("id", candidateIds)
    .in("content_type", HOME_REC_CONTENT_TYPES)
    .order("external_rating", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (recsError) {
    console.error("failed to load home recommendations", recsError);
    return fetchPopularFallback(supabase, limit);
  }

  if (!recs || recs.length === 0) return fetchPopularFallback(supabase, limit);

  return {
    personalized: true,
    items: (recs as unknown as HomeRecCandidateRow[]).map(toHomeRecommendation),
  };
}

// ---------------------------------------------------------------------------
// AI search logs
// ---------------------------------------------------------------------------

export interface AiSearchLogItem {
  id: string;
  query_text: string;
  result_count: number;
  created_at: string;
}

export async function fetchMyAiSearchLogs(
  supabase: SupabaseClient,
  limit: number
): Promise<AiSearchLogItem[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("ai_search_log")
    .select("id, query_text, result_count, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("failed to load AI search logs", error);
    return [];
  }

  return (data ?? []) as AiSearchLogItem[];
}

export async function clearMyAiSearchLogs(supabase: SupabaseClient): Promise<MutationResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not_authenticated" };

  const { error } = await supabase.from("ai_search_log").delete().eq("user_id", user.id);

  if (error) {
    console.error("failed to clear AI search logs", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export type AiSearchFeedback = "RELEVANT" | "NOT_RELEVANT";

export async function submitAiSearchFeedback(
  supabase: SupabaseClient,
  searchLogId: string,
  contentId: string,
  feedback: AiSearchFeedback
): Promise<MutationResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not_authenticated" };

  const { error } = await supabase
    .from("ai_search_result_feedback")
    .insert({ search_log_id: searchLogId, content_id: contentId, feedback });

  if (error) {
    // 23505 = unique_violation: feedback for this result was already
    // recorded. There's no UPDATE policy on this table (feedback is
    // write-once by design), so treat a duplicate as already-succeeded
    // rather than surfacing an error to the user.
    if (error.code === "23505") return { success: true };
    console.error("failed to submit AI search feedback", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
