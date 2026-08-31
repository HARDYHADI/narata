import type { SupabaseClient } from "@supabase/supabase-js";

export interface RatingSummary {
  average: number;
  count: number;
  distribution: { star: number; count: number; pct: number }[];
}

export async function fetchRatingSummary(
  supabase: SupabaseClient,
  contentId: string
): Promise<RatingSummary> {
  const { data, error } = await supabase
    .from("content_rating")
    .select("score")
    .eq("content_id", contentId);

  if (error) {
    console.error("failed to load rating summary", error);
    return { average: 0, count: 0, distribution: [5, 4, 3, 2, 1].map((star) => ({ star, count: 0, pct: 0 })) };
  }

  const scores = (data ?? []).map((row) => Number(row.score));
  const count = scores.length;
  const average = count > 0 ? scores.reduce((a, b) => a + b, 0) / count : 0;

  const buckets = new Map<number, number>();
  for (const score of scores) {
    const star = Math.min(5, Math.max(1, Math.round(score)));
    buckets.set(star, (buckets.get(star) ?? 0) + 1);
  }

  const distribution = [5, 4, 3, 2, 1].map((star) => {
    const starCount = buckets.get(star) ?? 0;
    return { star, count: starCount, pct: count > 0 ? Math.round((starCount / count) * 100) : 0 };
  });

  return { average, count, distribution };
}

export interface Review {
  id: string;
  body: string;
  contains_spoiler: boolean;
  helpful_count: number;
  created_at: string;
  score: number;
  author_nickname: string;
}

const REVIEW_SELECT =
  "id, body, contains_spoiler, helpful_count, created_at, profile(nickname), content_rating(score)";

interface ReviewRow {
  id: string;
  body: string;
  contains_spoiler: boolean;
  helpful_count: number;
  created_at: string;
  profile: { nickname: string } | null;
  content_rating: { score: number } | null;
}

export type ReviewSort = "helpful" | "latest";

export async function fetchReviews(
  supabase: SupabaseClient,
  contentId: string,
  sort: ReviewSort = "helpful"
): Promise<Review[]> {
  let query = supabase
    .from("review")
    .select(REVIEW_SELECT)
    .eq("content_id", contentId)
    .eq("is_hidden", false);

  query =
    sort === "latest"
      ? query.order("created_at", { ascending: false })
      : query.order("helpful_count", { ascending: false }).order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error("failed to load reviews", error);
    return [];
  }

  return ((data ?? []) as unknown as ReviewRow[]).map((row) => ({
    id: row.id,
    body: row.body,
    contains_spoiler: row.contains_spoiler,
    helpful_count: row.helpful_count,
    created_at: row.created_at,
    score: row.content_rating?.score ?? 0,
    author_nickname: row.profile?.nickname ?? "익명",
  }));
}

export interface MyRating {
  id: string;
  score: number;
}

export async function fetchMyRating(
  supabase: SupabaseClient,
  contentId: string
): Promise<MyRating | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("content_rating")
    .select("id, score")
    .eq("content_id", contentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("failed to load my rating", error);
    return null;
  }

  return data as MyRating | null;
}

export interface MutationResult {
  success: boolean;
  error?: string;
}

export interface SubmitRatingResult extends MutationResult {
  rating?: MyRating;
}

export async function submitRating(
  supabase: SupabaseClient,
  contentId: string,
  score: number
): Promise<SubmitRatingResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not_authenticated" };

  const { data, error } = await supabase
    .from("content_rating")
    .upsert(
      { content_id: contentId, user_id: user.id, score, updated_at: new Date().toISOString() },
      { onConflict: "content_id,user_id" }
    )
    .select("id, score")
    .single();

  if (error) {
    console.error("failed to submit rating", error);
    return { success: false, error: error.message };
  }

  return { success: true, rating: data as MyRating };
}

export interface SubmitReviewResult extends MutationResult {
  reviewId?: string;
}

export async function submitReview(
  supabase: SupabaseClient,
  contentId: string,
  body: string,
  containsSpoiler: boolean
): Promise<SubmitReviewResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not_authenticated" };

  const { data: rating, error: ratingError } = await supabase
    .from("content_rating")
    .select("id")
    .eq("content_id", contentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (ratingError) {
    console.error("failed to load rating for review", ratingError);
    return { success: false, error: ratingError.message };
  }
  if (!rating) {
    return { success: false, error: "rating_required" };
  }

  const { data, error } = await supabase
    .from("review")
    .upsert(
      {
        content_rating_id: rating.id,
        content_id: contentId,
        user_id: user.id,
        body,
        contains_spoiler: containsSpoiler,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "content_rating_id" }
    )
    .select("id")
    .single();

  if (error) {
    console.error("failed to submit review", error);
    return { success: false, error: error.message };
  }

  return { success: true, reviewId: data.id as string };
}

export interface ToggleResult extends MutationResult {
  active: boolean;
}

export async function toggleReviewHelpful(
  supabase: SupabaseClient,
  reviewId: string
): Promise<ToggleResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not_authenticated", active: false };

  const { data: existing, error: selectError } = await supabase
    .from("review_helpful")
    .select("review_id")
    .eq("review_id", reviewId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (selectError) {
    console.error("failed to check helpful vote", selectError);
    return { success: false, error: selectError.message, active: false };
  }

  if (existing) {
    const { error } = await supabase
      .from("review_helpful")
      .delete()
      .eq("review_id", reviewId)
      .eq("user_id", user.id);

    if (error) {
      console.error("failed to remove helpful vote", error);
      return { success: false, error: error.message, active: true };
    }
    return { success: true, active: false };
  }

  const { error } = await supabase.from("review_helpful").insert({ review_id: reviewId, user_id: user.id });

  if (error) {
    console.error("failed to add helpful vote", error);
    return { success: false, error: error.message, active: false };
  }
  return { success: true, active: true };
}

export interface ContentTag {
  id: string;
  name: string;
  category: "MOOD" | "CONTENT_ADVISORY";
  kind: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
}

export async function fetchContentTags(
  supabase: SupabaseClient,
  category: "MOOD" | "CONTENT_ADVISORY"
): Promise<ContentTag[]> {
  const { data, error } = await supabase
    .from("content_tag")
    .select("id, name, category, kind")
    .eq("category", category)
    .order("name");

  if (error) {
    console.error("failed to load content tags", error);
    return [];
  }

  return (data ?? []) as ContentTag[];
}

export interface TagVotePercentage {
  tag_id: string;
  name: string;
  category: string;
  kind: string;
  votes: number;
  percentage: number;
}

interface TagVoteRow {
  tag_id: string;
  content_tag: { name: string; category: string; kind: string } | null;
}

export async function fetchContentTagVotePercentages(
  supabase: SupabaseClient,
  contentId: string
): Promise<TagVotePercentage[]> {
  const [votesResult, ratersResult] = await Promise.all([
    supabase.from("content_tag_vote").select("tag_id, content_tag(name, category, kind)").eq("content_id", contentId),
    supabase.from("content_rating").select("id", { count: "exact", head: true }).eq("content_id", contentId),
  ]);

  if (votesResult.error) {
    console.error("failed to load tag votes", votesResult.error);
    return [];
  }
  if (ratersResult.error) {
    console.error("failed to load rater count", ratersResult.error);
    return [];
  }

  const raterCount = ratersResult.count ?? 0;
  const counts = new Map<string, { name: string; category: string; kind: string; votes: number }>();

  for (const row of (votesResult.data ?? []) as unknown as TagVoteRow[]) {
    if (!row.content_tag) continue;
    const entry = counts.get(row.tag_id) ?? { ...row.content_tag, votes: 0 };
    entry.votes += 1;
    counts.set(row.tag_id, entry);
  }

  return Array.from(counts.entries())
    .map(([tag_id, entry]) => ({
      tag_id,
      name: entry.name,
      category: entry.category,
      kind: entry.kind,
      votes: entry.votes,
      percentage: raterCount > 0 ? Math.round((entry.votes / raterCount) * 100) : 0,
    }))
    .sort((a, b) => b.percentage - a.percentage);
}

export async function toggleTagVote(
  supabase: SupabaseClient,
  contentId: string,
  tagId: string
): Promise<ToggleResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not_authenticated", active: false };

  const { data: existing, error: selectError } = await supabase
    .from("content_tag_vote")
    .select("tag_id")
    .eq("content_id", contentId)
    .eq("tag_id", tagId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (selectError) {
    console.error("failed to check tag vote", selectError);
    return { success: false, error: selectError.message, active: false };
  }

  if (existing) {
    const { error } = await supabase
      .from("content_tag_vote")
      .delete()
      .eq("content_id", contentId)
      .eq("tag_id", tagId)
      .eq("user_id", user.id);

    if (error) {
      console.error("failed to remove tag vote", error);
      return { success: false, error: error.message, active: true };
    }
    return { success: true, active: false };
  }

  const { error } = await supabase
    .from("content_tag_vote")
    .insert({ content_id: contentId, tag_id: tagId, user_id: user.id });

  if (error) {
    console.error("failed to add tag vote", error);
    return { success: false, error: error.message, active: false };
  }
  return { success: true, active: true };
}
