"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";

// This app uses supabase-js's default *implicit* OAuth flow (no @supabase/ssr,
// no server-side cookies), so Google redirects here with the session tokens
// in the URL fragment (#access_token=...) rather than a `code` query param.
// Fragments are never sent to the server, so this must be a client page —
// a route.ts handler could not read them. The Supabase client parses that
// fragment and persists the session automatically on initialization; calling
// getSession() below awaits that initialization before resolving.
// See: https://supabase.com/docs/guides/auth/sessions/implicit-flow

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("로그인 설정이 아직 완료되지 않았어요.");
      return;
    }

    let cancelled = false;

    (async () => {
      const next = new URLSearchParams(window.location.search).get("next");
      const safeNext = next && next.startsWith("/") ? next : "/";

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;

      if (session) {
        router.replace(safeNext);
      } else {
        setError("로그인에 실패했어요. 다시 시도해주세요.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div
      className="wrap"
      style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div className="card" style={{ padding: 40, width: "100%", maxWidth: 380, textAlign: "center" }}>
        {error ? (
          <>
            <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>로그인에 실패했어요</h1>
            <p className="muted" style={{ margin: "0 0 24px" }}>
              {error}
            </p>
            <Link href="/login" className="btn orange">
              다시 시도하기
            </Link>
          </>
        ) : (
          <p className="muted">로그인 처리 중입니다...</p>
        )}
      </div>
    </div>
  );
}
