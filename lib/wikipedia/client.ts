import { EXTERNAL_REQUEST_DELAY_MS, sleep } from "../relations/util";

const USER_AGENT = "Narata/1.0 (content relation discovery; https://github.com/HARDYHADI/narata)";
const MAX_EXTRACT_CHARS = 6000;

export interface WikipediaFullText {
  title: string;
  text: string;
  lang: "ko" | "en";
}

interface ActionApiPage {
  title?: string;
  missing?: boolean;
  extract?: string;
}

interface ActionApiResponse {
  query?: { pages?: ActionApiPage[] };
}

async function fetchFullTextForLang(title: string, lang: "ko" | "en"): Promise<WikipediaFullText | null> {
  const url = new URL(`https://${lang}.wikipedia.org/w/api.php`);
  url.searchParams.set("action", "query");
  url.searchParams.set("prop", "extracts");
  url.searchParams.set("explaintext", "1");
  url.searchParams.set("exlimit", "1");
  url.searchParams.set("redirects", "1");
  url.searchParams.set("titles", title);
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": USER_AGENT, accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  await sleep(EXTERNAL_REQUEST_DELAY_MS);

  if (!res.ok) {
    console.error(`wikipedia full-text fetch failed (${res.status}) for "${title}" [${lang}]`);
    return null;
  }

  const data = (await res.json()) as ActionApiResponse;
  const page = data.query?.pages?.[0];
  if (!page || page.missing || !page.extract) return null;

  return { title: page.title ?? title, text: page.extract.slice(0, MAX_EXTRACT_CHARS), lang };
}

/**
 * Fetches the plain-text full article body for `title` from Wikipedia's
 * free, keyless Action API (prop=extracts&explaintext), truncated to a
 * length that keeps the grounded-extraction LLM call's cost bounded.
 *
 * This replaces an earlier version of tier 2 that only used the REST
 * summary endpoint (lead paragraph only) — that missed relations mentioned
 * further down an article (e.g. Breaking Bad's lead paragraph doesn't
 * mention its spin-off Better Call Saul, but the body does). Tries `lang`
 * first (default "ko") and falls back to English.
 */
export async function fetchWikipediaFullText(
  title: string,
  lang: "ko" | "en" = "ko"
): Promise<WikipediaFullText | null> {
  const primary = await fetchFullTextForLang(title, lang);
  if (primary) return primary;
  if (lang === "ko") return fetchFullTextForLang(title, "en");
  return null;
}
