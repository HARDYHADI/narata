"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function AuthStatus() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [nickname, setNickname] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setReady(true);
      return;
    }

    let cancelled = false;

    async function syncNickname(userId: string, fallback: string) {
      const { data } = await supabase!
        .from("profile")
        .select("nickname")
        .eq("id", userId)
        .maybeSingle();
      if (!cancelled) setNickname(data?.nickname ?? fallback);
    }

    // onAuthStateChange fires an INITIAL_SESSION event immediately on
    // subscribe (after the client's URL/localStorage session detection
    // resolves), then SIGNED_IN / SIGNED_OUT on every later change — so this
    // one subscription both loads the initial state and keeps it live,
    // without a full page reload, across login and logout.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session?.user) {
        syncNickname(session.user.id, session.user.email?.split("@")[0] ?? "회원");
      } else {
        setNickname(null);
      }
      setReady(true);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setSigningOut(true);
    await supabase.auth.signOut();
    setSigningOut(false);
    router.refresh();
  }, [router]);

  if (!ready) {
    return null;
  }

  if (!nickname) {
    const next =
      typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
    return (
      <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn">
        로그인
      </Link>
    );
  }

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <span className="muted" style={{ fontWeight: 700 }}>
        {nickname}님
      </span>
      <button type="button" className="btn ghost" onClick={handleSignOut} disabled={signingOut}>
        로그아웃
      </button>
    </div>
  );
}
