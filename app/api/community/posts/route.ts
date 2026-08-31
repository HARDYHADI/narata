import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashGuestPassword, hashIp, getRequestIp, verifyTurnstile } from "@/lib/community/guest";
import { POST_HEADS } from "@/lib/community/format";

export const runtime = "nodejs";

interface AnonymousPostBody {
  galleryId?: string;
  head?: string;
  title?: string;
  body?: string;
  containsSpoiler?: boolean;
  guestNickname?: string;
  guestPassword?: string;
  captchaToken?: string;
}

const MIN_GUEST_PASSWORD_LENGTH = 4;

// Anonymous post creation. Logged-in users insert directly via the browser
// Supabase client (RLS handles it — see lib/community/queries.ts#createPost);
// this route exists only because anonymous writes need CAPTCHA verification
// and server-side password hashing, neither of which RLS can do.
export async function POST(request: NextRequest) {
  let payload: AnonymousPostBody;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { galleryId, head, containsSpoiler, guestNickname, guestPassword, captchaToken } = payload;
  const title = payload.title?.trim();
  const body = payload.body?.trim();

  if (!galleryId || !head || !title || !body) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (!POST_HEADS.includes(head as (typeof POST_HEADS)[number])) {
    return NextResponse.json({ error: "invalid_head" }, { status: 400 });
  }
  if (!guestPassword || guestPassword.length < MIN_GUEST_PASSWORD_LENGTH) {
    return NextResponse.json({ error: "weak_password" }, { status: 400 });
  }

  const captchaOk = await verifyTurnstile(captchaToken);
  if (!captchaOk) {
    return NextResponse.json({ error: "captcha_failed" }, { status: 403 });
  }

  const admin = getSupabaseAdminClient();

  const { data: gallery, error: galleryError } = await admin
    .from("gallery")
    .select("id, allow_anonymous_posts")
    .eq("id", galleryId)
    .maybeSingle();

  if (galleryError) {
    console.error("failed to load gallery for anonymous post", galleryError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!gallery) {
    return NextResponse.json({ error: "gallery_not_found" }, { status: 404 });
  }
  if (!gallery.allow_anonymous_posts) {
    return NextResponse.json({ error: "login_required" }, { status: 403 });
  }

  const passwordHash = await hashGuestPassword(guestPassword);
  const ipHash = hashIp(getRequestIp(request));

  const { data, error } = await admin
    .from("post")
    .insert({
      gallery_id: galleryId,
      guest_nickname: guestNickname?.trim() || "ㅇㅇ",
      guest_password_hash: passwordHash,
      ip_hash: ipHash,
      head,
      title,
      body,
      contains_spoiler: Boolean(containsSpoiler),
    })
    .select("id")
    .single();

  if (error) {
    console.error("failed to create anonymous post", error);
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true, postId: data.id });
}
