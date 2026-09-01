"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";

function readNext(): string {
  if (typeof window === "undefined") return "/";
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") ? next : "/";
}

export default function LoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setChecking(false);
      return;
    }

    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;

      if (user) {
        // Already logged in — nothing to do here, send them back.
        router.replace(readNext());
        return;
      }

      setChecking(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleGoogleLogin() {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("로그인 설정이 아직 완료되지 않았어요. 잠시 후 다시 시도해주세요.");
      return;
    }

    setStarting(true);
    setError(null);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(readNext())}`,
      },
    });

    if (oauthError) {
      setStarting(false);
      setError("구글 로그인을 시작하지 못했어요. 잠시 후 다시 시도해주세요.");
    }
    // On success the browser navigates away to Google's consent screen, so
    // there's nothing further to do in this component.
  }

  if (checking) {
    return null;
  }

  return (
    <div
      className="wrap"
      style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div className="card" style={{ padding: 40, width: "100%", maxWidth: 380, textAlign: "center" }}>
        <Link href="/" className="logo" style={{ display: "inline-block", marginBottom: 24 }}>
          <b>N</b>ㅏ라타
        </Link>
        <h1 style={{ fontSize: 24, margin: "0 0 8px" }}>로그인</h1>
        <p className="muted" style={{ margin: "0 0 28px" }}>
          평가, 리뷰, 컬렉션, 커뮤니티 활동을 하려면 로그인이 필요해요.
        </p>
        <button
          type="button"
          className="btn orange"
          style={{ width: "100%" }}
          onClick={handleGoogleLogin}
          disabled={starting}
        >
          {starting ? "이동 중..." : "Google로 계속하기"}
        </button>
        {error && (
          <p className="muted" style={{ marginTop: 16, color: "var(--red)" }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
