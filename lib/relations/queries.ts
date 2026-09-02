import type { SupabaseClient } from "@supabase/supabase-js";

export type RelationFeedback = "CONFIRM" | "REJECT";

export interface SubmitRelationFeedbackResult {
  success: boolean;
  error?: string;
}

// Community verification (Tier 4): a logged-in user confirms or rejects a
// content_relation. Upserts on the (relation_id, user_id) primary key, so
// re-clicking the other option just changes the user's own vote instead of
// erroring — mirrors how content_rating.submitRating upserts a user's
// single rating rather than toggling like review_helpful/content_tag_vote
// (a relation only has one final answer per user, not an on/off state).
// Enough REJECTs auto-hides the relation server-side (see the
// apply_content_relation_auto_hide trigger, mirroring the report auto-hide
// pattern) — no manual moderation queue.
export async function submitRelationFeedback(
  supabase: SupabaseClient,
  relationId: string,
  feedback: RelationFeedback
): Promise<SubmitRelationFeedbackResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not_authenticated" };

  const { error } = await supabase
    .from("content_relation_feedback")
    .upsert(
      { relation_id: relationId, user_id: user.id, feedback },
      { onConflict: "relation_id,user_id" }
    );

  if (error) {
    console.error("failed to submit relation feedback", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
