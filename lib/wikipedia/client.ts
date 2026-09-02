import { EXTERNAL_REQUEST_DELAY_MS, sleep } from "../relations/util";

const USER_AGENT = "Narata/1.0 (content relation discovery; https://github.com/HARDYHADI/narata)";

export interface WikipediaSummary {
  title: string;
  extract: string;
  lang: "ko" | "en";
}

async function fetchSummaryForLang(title: string, lang: "ko" | "en"): Promise<WikipediaSummary | null> {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, accept: "application/json" } });
  await sleep(EXTERNAL_REQUEST_DELAY_MS);

  if (res.status === 404) return null;
  if (!res.ok) {
    console.error(`wikipedia summary fetch failed (${res.status}) for "${title}" [${lang}]`);
    return null;
  }

  const data = (await res.json()) as { extract?: string; title?: string };
  if (!data.extract) return null;

  return { title: data.title ?? title, extract: data.extract, lang };
}

/**
 * Fetches the plain-text summary extract for `title` from Wikipedia's free,
 * keyless REST summary endpoint. Tries `lang` first (default "ko") and, if
 * that 404s, falls back to English. Returns null if neither has a page or
 * neither has an extract — callers should skip this content_id for tier 2
 * rather than substitute anything.
 */
export async function fetchWikipediaSummary(
  title: string,
  lang: "ko" | "en" = "ko"
): Promise<WikipediaSummary | null> {
  const primary = await fetchSummaryForLang(title, lang);
  if (primary) return primary;
  if (lang === "ko") return fetchSummaryForLang(title, "en");
  return null;
}
