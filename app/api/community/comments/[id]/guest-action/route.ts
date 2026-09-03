import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyGuestPassword } from "@/lib/community/guest";

export const runtime = "nodejs";

interface GuestActionBody {
  password?: string;
  action?: "edit" | "delete";
  body?: string;
}

// Same pattern as app/api/community/posts/[id]/guest-action — see that
// route's comments for why this needs the service-role client instead of
// RLS.
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

  const { data: comment, error: fetchError } = await admin
    .from("comment")
    .select("id, user_id, guest_password_hash")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    console.error("failed to load comment for guest action", fetchError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  if (!comment || comment.user_id !== null || !comment.guest_password_hash) {
    return NextResponse.json({ error: "invalid_password" }, { status: 403 });
  }

  const passwordOk = await verifyGuestPassword(password, comment.guest_password_hash);
  if (!passwordOk) {
    return NextResponse.json({ error: "invalid_password" }, { status: 403 });
  }

  if (action === "delete") {
    const { error } = await admin.from("comment").delete().eq("id", id);
    if (error) {
      console.error("failed to delete guest comment", error);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  const body = payload.body?.trim();
  if (!body) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const { error } = await admin.from("comment").update({ body }).eq("id", id);

  if (error) {
    console.error("failed to update guest comment", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
