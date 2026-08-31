"use client";

import { useEffect, useRef } from "react";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";
let scriptLoadPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("failed to load turnstile script"));
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

interface TurnstileGlobal {
  render: (el: Element, options: { sitekey: string; callback: (token: string) => void }) => void;
}

// Renders the Cloudflare Turnstile widget when NEXT_PUBLIC_TURNSTILE_SITE_KEY
// is configured; otherwise shows a dev-mode note and calls onVerify with no
// token (the server route skips verification the same way when
// TURNSTILE_SECRET_KEY isn't set — see lib/community/guest.ts).
export default function CaptchaWidget({ onVerify }: { onVerify: (token: string) => void }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;
    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const turnstile = (window as unknown as { turnstile?: TurnstileGlobal }).turnstile;
        turnstile?.render(containerRef.current, { sitekey: siteKey, callback: onVerify });
      })
      .catch((err) => console.error("failed to load turnstile", err));

    return () => {
      cancelled = true;
    };
  }, [siteKey, onVerify]);

  if (!siteKey) {
    return (
      <div className="muted" style={{ fontSize: 12 }}>
        CAPTCHA 미설정 상태예요 (개발 환경 전용). 운영 환경에서는 익명 글쓰기에 인증이 필요해요.
      </div>
    );
  }

  return <div ref={containerRef} />;
}
