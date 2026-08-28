export const COUNTRY_LABELS: Record<string, string> = {
  KR: "한국",
  US: "미국",
  JP: "일본",
  GB: "영국",
  FR: "프랑스",
  CN: "중국",
  DE: "독일",
  CA: "캐나다",
  ES: "스페인",
  IT: "이탈리아",
  IN: "인도",
  AU: "호주",
};

export function formatCountry(code: string | null): string | null {
  if (!code) return null;
  return COUNTRY_LABELS[code] ?? code;
}

export function formatRuntime(minutes: number | null): string | null {
  if (!minutes) return null;
  return `${minutes}분`;
}

const STATUS_LABELS: Record<string, string> = {
  UPCOMING: "공개 예정",
  ONGOING: "상영/연재 중",
  COMPLETED: "공개됨",
  HIATUS: "휴재",
  CANCELLED: "취소됨",
  UNKNOWN: "상태 미상",
};

export function formatStatus(status: string): string {
  return STATUS_LABELS[status] ?? status;
}
