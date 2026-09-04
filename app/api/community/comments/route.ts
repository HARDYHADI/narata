import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashGuestPassword, hashIp, getRequestIp, verifyTurnstile } from "@/lib/community/guest";
import { checkRateLimit, resolveBucketKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

interface AnonymousCommentBody {
  postId?: string;
  body?: string;
  parentCommentId?: string;
  guestNickname?: string;
  guestPassword?: string;
  captchaToken?: string;
}

const MIN_GUEST_PASSWORD_LENGTH = 4;
const RATE_LIMIT_ROUTE = "community_anonymous_comment";
const RATE_LIMIT_MAX_REQUESTS = 15;
const RATE_LIMIT_WINDOW_MINUTES = 10;

// Anonymous comment creation on a post (mirrors app/api/community/posts).
// Review comments always require login regardless of content type, so there
// is no anonymous path for review_id comments — this route only ever inserts
// against post_id.
export async function POST(request: NextRequest) {
  let payload: AnonymousCommentBody;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { postId, parentCommentId, guestNickname, guestPassword, captchaToken } = payload;
  const body = payload.body?.trim();

  if (!postId || !body) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (!guestPassword || guestPassword.length < MIN_GUEST_PASSWORD_LENGTH) {
    return NextResponse.json({ error: "weak_password" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const ipHash = hashIp(getRequestIp(request));
  const rateLimit = await checkRateLimit(
    admin,
    resolveBucketKey(null, ipHash),
    RATE_LIMIT_ROUTE,
    RATE_LIMIT_MAX_REQUESTS,
    RATE_LIMIT_WINDOW_MINUTES
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많아요. 잠시 후 다시 시도해주세요." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds ?? 60) } }
    );
  }

  const captchaOk = await verifyTurnstile(captchaToken);
  if (!captchaOk) {
    return NextResponse.json({ error: "captcha_failed" }, { status: 403 });
  }

  const { data: post, error: postError } = await admin
    .from("post")
    .select("id, gallery_id, gallery(allow_anonymous_posts)")
    .eq("id", postId)
    .eq("is_hidden", false)
    .maybeSingle();

  if (postError) {
    console.error("failed to load post for anonymous comment", postError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!post) {
    return NextResponse.json({ error: "post_not_found" }, { status: 404 });
  }
  const gallery = post.gallery as unknown as { allow_anonymous_posts: boolean } | null;
  if (!gallery?.allow_anonymous_posts) {
    return NextResponse.json({ error: "login_required" }, { status: 403 });
  }

  if (parentCommentId) {
    const { data: parent, error: parentError } = await admin
      .from("comment")
      .select("id, post_id")
      .eq("id", parentCommentId)
      .maybeSingle();
    if (parentError) {
      console.error("failed to load parent comment for anonymous reply", parentError);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
    if (!parent || parent.post_id !== postId) {
      return NextResponse.json({ error: "invalid_parent_comment" }, { status: 400 });
    }
  }

  const passwordHash = await hashGuestPassword(guestPassword);

  const { data, error } = await admin
    .from("comment")
    .insert({
      post_id: postId,
      parent_comment_id: parentCommentId ?? null,
      guest_nickname: guestNickname?.trim() || "ㅇㅇ",
      guest_password_hash: passwordHash,
      ip_hash: ipHash,
      body,
    })
    .select("id")
    .single();

  if (error) {
    console.error("failed to create anonymous comment", error);
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true, commentId: data.id });
}
