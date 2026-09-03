import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyGuestPassword } from "@/lib/community/guest";

export const runtime = "nodejs";

interface GuestActionBody {
  password?: string;
  action?: "edit" | "delete";
  title?: string;
  body?: string;
  containsSpoiler?: boolean;
}

// Edit/delete for an anonymous (guest) post, verified by the password set at
// creation time. RLS can't do this — a plaintext password check against a
// stored hash isn't something a row policy can express — so this route uses
// the service-role client after verifying the password itself. Logged-in
// users' own posts are edited/deleted directly through the browser client
// (RLS handles that via user_id = auth.uid()), not this route.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let payload: GuestActionBody;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { password, action } = payload;
  if (!password || (action !== "edit" && action !== "delete")) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();

  const { data: post, error: fetchError } = await admin
    .from("post")
    .select("id, user_id, guest_password_hash")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    console.error("failed to load post for guest action", fetchError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // Same generic error whether the post doesn't exist, isn't a guest post,
  // or the password is wrong — don't give an attacker a way to distinguish
  // "wrong password" from "not a guest post".
  if (!post || post.user_id !== null || !post.guest_password_hash) {
    return NextResponse.json({ error: "invalid_password" }, { status: 403 });
  }

  const passwordOk = await verifyGuestPassword(password, post.guest_password_hash);
  if (!passwordOk) {
    return NextResponse.json({ error: "invalid_password" }, { status: 403 });
  }

  if (action === "delete") {
    const { error } = await admin.from("post").delete().eq("id", id);
    if (error) {
      console.error("failed to delete guest post", error);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  const title = payload.title?.trim();
  const body = payload.body?.trim();
  if (!title || !body) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const { error } = await admin
    .from("post")
    .update({ title, body, contains_spoiler: Boolean(payload.containsSpoiler) })
    .eq("id", id);

  if (error) {
    console.error("failed to update guest post", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
