// Renders the "ㅇㅇ(39.7)"-style DCInside anonymous author tag. The suffix is
// derived from ip_hash (never the raw IP, which we never store) purely so
// different anonymous posters in the same thread read as visually distinct —
// it carries no real network information.
export function formatGuestAuthor(guestNickname: string | null, ipHash: string | null): string {
  const nickname = guestNickname?.trim() || "ㅇㅇ";

  if (nickname !== "ㅇㅇ" || !ipHash) {
    return nickname;
  }

  const a = parseInt(ipHash.slice(0, 2), 16) || 0;
  const b = parseInt(ipHash.slice(2, 4), 16) || 0;
  return `ㅇㅇ(${a}.${b})`;
}

export function formatAuthor(
  profileNickname: string | null | undefined,
  guestNickname: string | null,
  ipHash: string | null
): string {
  if (profileNickname) return profileNickname;
  return formatGuestAuthor(guestNickname, ipHash);
}

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR");
}

export const POST_HEADS = ["공지", "분석", "감상", "질문", "정보", "창작", "재미", "추천"] as const;
export type PostHead = (typeof POST_HEADS)[number];

export const ANONYMOUS_CONTENT_TYPES = ["ANIME", "COMIC", "WEBTOON", "WEBNOVEL"] as const;
