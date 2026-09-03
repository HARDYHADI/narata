"use client";

import { useState } from "react";

// Web Share API where available (mobile browsers, mostly), clipboard-copy
// fallback everywhere else (most desktop browsers). Shares the current
// page URL — every call site here already links out from its own page,
// so there's no reason to require a separate `url` prop.
export default function ShareButton({
  title,
  label,
  className = "btn ghost",
}: {
  title: string;
  label?: string;
  className?: string;
}) {
  const [notice, setNotice] = useState<string | null>(null);

  async function handleShare() {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // User cancelled the native share sheet — not an error.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setNotice("링크를 복사했어요");
    } catch {
      setNotice("복사에 실패했어요");
    }
    setTimeout(() => setNotice(null), 2000);
  }

  return (
    <button type="button" className={className} onClick={handleShare}>
      {notice ?? label ?? "공유"}
    </button>
  );
}
