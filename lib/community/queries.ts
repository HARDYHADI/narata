import type { SupabaseClient } from "@supabase/supabase-js";

export interface MutationResult {
  success: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------

export interface Gallery {
  id: string;
  content_id: string | null;
  slug: string;
  name: string;
  description: string | null;
  allow_anonymous_posts: boolean;
  post_count: number;
  member_count: number;
}

const GALLERY_SELECT =
  "id, content_id, slug, name, description, allow_anonymous_posts, post_count, member_count";

// Lazily creates the gallery for a piece of content on first visit (via the
// SECURITY DEFINER RPC — there is no direct INSERT grant on `gallery`).
export async function getOrCreateContentGallery(
  supabase: SupabaseClient,
  contentId: string
): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_or_create_content_gallery", {
    p_content_id: contentId,
  });

  if (error) {
    console.error("failed to get or create content gallery", error);
    return null;
  }

  return data as string;
}

export async function fetchGallery(
  supabase: SupabaseClient,
  galleryId: string
): Promise<Gallery | null> {
  const { data, error } = await supabase
    .from("gallery")
    .select(GALLERY_SELECT)
    .eq("id", galleryId)
    .maybeSingle();

  if (error) {
    console.error("failed to load gallery", error);
    return null;
  }

  return data as Gallery | null;
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export interface PostListItem {
  id: string;
  gallery_id: string;
  head: string;
  title: string;
  is_notice: boolean;
  contains_spoiler: boolean;
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  user_id: string | null;
  guest_nickname: string | null;
  ip_hash: string | null;
  profile: { nickname: string } | null;
}

const POST_LIST_SELECT =
  "id, gallery_id, head, title, is_notice, contains_spoiler, view_count, like_count, comment_count, created_at, user_id, guest_nickname, ip_hash, profile(nickname)";

export type PostSort = "latest" | "comments";

export async function fetchGalleryPosts(
  supabase: SupabaseClient,
  galleryId: string,
  sort: PostSort = "comments",
  limit = 30
): Promise<PostListItem[]> {
  let query = supabase
    .from("post")
    .select(POST_LIST_SELECT)
    .eq("gallery_id", galleryId)
    .eq("is_hidden", false)
    .order("is_notice", { ascending: false });

  query =
    sort === "comments"
      ? query.order("comment_count", { ascending: false }).order("created_at", { ascending: false })
      : query.order("created_at", { ascending: false });

  const { data, error } = await query.limit(limit);

  if (error) {
    console.error("failed to load gallery posts", error);
    return [];
  }

  return (data ?? []) as unknown as PostListItem[];
}

export interface PostDetail extends PostListItem {
  body: string;
}

const POST_DETAIL_SELECT =
  "id, gallery_id, head, title, body, is_notice, contains_spoiler, view_count, like_count, comment_count, created_at, user_id, guest_nickname, ip_hash, profile(nickname)";

export async function fetchPost(
  supabase: SupabaseClient,
  postId: string
): Promise<PostDetail | null> {
  const { data, error } = await supabase
    .from("post")
    .select(POST_DETAIL_SELECT)
    .eq("id", postId)
    .eq("is_hidden", false)
    .maybeSingle();

  if (error) {
    console.error("failed to load post", error);
    return null;
  }

  return data as unknown as PostDetail | null;
}

export async function recordPostView(supabase: SupabaseClient, postId: string): Promise<void> {
  const { error } = await supabase.rpc("increment_post_view_count", { p_post_id: postId });
  if (error) console.error("failed to record post view", error);
}

export interface CreatePostResult extends MutationResult {
  postId?: string;
}

// Logged-in post creation: goes straight through the browser client, RLS
// handles authorization (same pattern as content_rating / review writes
// elsewhere in this app). Anonymous submissions go through
// app/api/community/posts (CAPTCHA + password hashing), not this function.
export async function createPost(
  supabase: SupabaseClient,
  params: { galleryId: string; head: string; title: string; body: string; containsSpoiler: boolean }
): Promise<CreatePostResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not_authenticated" };

  const title = params.title.trim();
  const body = params.body.trim();
  if (!title || !body) return { success: false, error: "empty_fields" };

  const { data, error } = await supabase
    .from("post")
    .insert({
      gallery_id: params.galleryId,
      user_id: user.id,
      head: params.head,
      title,
      body,
      contains_spoiler: params.containsSpoiler,
    })
    .select("id")
    .single();

  if (error) {
    console.error("failed to create post", error);
    return { success: false, error: error.message };
  }

  return { success: true, postId: data.id as string };
}

// ---------------------------------------------------------------------------
// Post likes
// ---------------------------------------------------------------------------

export interface ToggleResult extends MutationResult {
  active: boolean;
}

export async function isPostLiked(supabase: SupabaseClient, postId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("post_like")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("failed to check post like", error);
    return false;
  }

  return Boolean(data);
}

// Likes always require login (no anonymous likes — prevents easy vote
// manipulation, matching the RLS policy).
export async function togglePostLike(supabase: SupabaseClient, postId: string): Promise<ToggleResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not_authenticated", active: false };

  const { data: existing, error: selectError } = await supabase
    .from("post_like")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (selectError) {
    console.error("failed to check post like", selectError);
    return { success: false, error: selectError.message, active: false };
  }

  if (existing) {
    const { error } = await supabase
      .from("post_like")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);

    if (error) {
      console.error("failed to remove post like", error);
      return { success: false, error: error.message, active: true };
    }
    return { success: true, active: false };
  }

  const { error } = await supabase.from("post_like").insert({ post_id: postId, user_id: user.id });

  if (error) {
    console.error("failed to add post like", error);
    return { success: false, error: error.message, active: false };
  }
  return { success: true, active: true };
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export interface CommentItem {
  id: string;
  post_id: string | null;
  review_id: string | null;
  parent_comment_id: string | null;
  body: string;
  created_at: string;
  user_id: string | null;
  guest_nickname: string | null;
  ip_hash: string | null;
  profile: { nickname: string } | null;
}

const COMMENT_SELECT =
  "id, post_id, review_id, parent_comment_id, body, created_at, user_id, guest_nickname, ip_hash, profile(nickname)";

export async function fetchPostComments(
  supabase: SupabaseClient,
  postId: string
): Promise<CommentItem[]> {
  const { data, error } = await supabase
    .from("comment")
    .select(COMMENT_SELECT)
    .eq("post_id", postId)
    .eq("is_hidden", false)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("failed to load post comments", error);
    return [];
  }

  return (data ?? []) as unknown as CommentItem[];
}

export interface CreateCommentResult extends MutationResult {
  commentId?: string;
}

// Logged-in comment creation on a post. Anonymous comments (allowed only on
// galleries with allow_anonymous_posts) would need the same CAPTCHA-gated API
// route treatment as anonymous posts; not yet built (see PR description).
export async function createPostComment(
  supabase: SupabaseClient,
  postId: string,
  body: string
): Promise<CreateCommentResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not_authenticated" };

  const trimmed = body.trim();
  if (!trimmed) return { success: false, error: "empty_body" };

  const { data, error } = await supabase
    .from("comment")
    .insert({ post_id: postId, user_id: user.id, body: trimmed })
    .select("id")
    .single();

  if (error) {
    console.error("failed to create comment", error);
    return { success: false, error: error.message };
  }

  return { success: true, commentId: data.id as string };
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export type ReportTargetType = "POST" | "COMMENT" | "REVIEW";

const DEFAULT_REPORT_REASON = "커뮤니티 이용 규칙 위반 신고";

export async function reportTarget(
  supabase: SupabaseClient,
  targetType: ReportTargetType,
  targetId: string
): Promise<MutationResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not_authenticated" };

  const { error } = await supabase.from("report").insert({
    reporter_user_id: user.id,
    target_type: targetType,
    target_id: targetId,
    reason: DEFAULT_REPORT_REASON,
  });

  if (error) {
    // 23505 = unique_violation: this user already reported this target.
    // Treat as already-succeeded rather than surfacing an error.
    if (error.code === "23505") return { success: true };
    console.error("failed to submit report", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// Aggregate community feed (app/community)
// ---------------------------------------------------------------------------

export interface FeedPostItem {
  id: string;
  gallery_id: string;
  head: string;
  title: string;
  is_notice: boolean;
  comment_count: number;
  view_count: number;
  like_count: number;
  created_at: string;
  user_id: string | null;
  guest_nickname: string | null;
  ip_hash: string | null;
  profile: { nickname: string } | null;
  gallery: { name: string; content: { id: string; canonical_title: string; content_type: string } | null } | null;
}

const FEED_SELECT =
  "id, gallery_id, head, title, is_notice, comment_count, view_count, like_count, created_at, user_id, guest_nickname, ip_hash, profile(nickname), gallery(name, content(id, canonical_title, content_type))";

export async function fetchCommunityFeed(
  supabase: SupabaseClient,
  sort: PostSort = "comments",
  limit = 30
): Promise<FeedPostItem[]> {
  let query = supabase.from("post").select(FEED_SELECT).eq("is_hidden", false);

  query =
    sort === "comments"
      ? query.order("comment_count", { ascending: false }).order("created_at", { ascending: false })
      : query.order("created_at", { ascending: false });

  const { data, error } = await query.limit(limit);

  if (error) {
    console.error("failed to load community feed", error);
    return [];
  }

  return (data ?? []) as unknown as FeedPostItem[];
}

export interface TrendingGallery {
  id: string;
  name: string;
  post_count: number;
}

export async function fetchTrendingGalleries(
  supabase: SupabaseClient,
  limit = 5
): Promise<TrendingGallery[]> {
  const { data, error } = await supabase
    .from("gallery")
    .select("id, name, post_count")
    .order("post_count", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("failed to load trending galleries", error);
    return [];
  }

  return (data ?? []) as TrendingGallery[];
}
