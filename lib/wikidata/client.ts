import { EXTERNAL_REQUEST_DELAY_MS, sleep } from "../relations/util";

const WIKIDATA_API_URL = "https://www.wikidata.org/w/api.php";
const USER_AGENT = "Narata/1.0 (content relation discovery; https://github.com/HARDYHADI/narata)";

export interface WikidataSearchCandidate {
  qid: string;
  label: string;
  description: string | null;
}

interface WbSearchEntitiesResponse {
  search?: { id: string; label?: string; description?: string }[];
}

async function fetchWbSearchEntities(
  title: string,
  language: "ko" | "en"
): Promise<WikidataSearchCandidate[]> {
  const url = new URL(WIKIDATA_API_URL);
  url.searchParams.set("action", "wbsearchentities");
  url.searchParams.set("search", title);
  url.searchParams.set("language", language);
  url.searchParams.set("format", "json");
  url.searchParams.set("type", "item");

  const res = await fetch(url.toString(), { headers: { "User-Agent": USER_AGENT } });
  await sleep(EXTERNAL_REQUEST_DELAY_MS);

  if (!res.ok) {
    console.error(`wikidata wbsearchentities failed (${res.status}) for "${title}" [${language}]`);
    return [];
  }

  const data = (await res.json()) as WbSearchEntitiesResponse;
  return (data.search ?? []).map((item) => ({
    qid: item.id,
    label: item.label ?? title,
    description: item.description ?? null,
  }));
}

// Wikidata descriptions are free text like "2010 American film directed by
// Christopher Nolan" — this is the only signal we have to disambiguate
// candidates without pulling in a whole other API, so we parse a year and a
// type keyword out of it rather than trust wbsearchentities' relevance
// ranking alone.
const CONTENT_TYPE_KEYWORDS: Record<string, string[]> = {
  MOVIE: ["film", "movie", "영화"],
  DRAMA: ["series", "tv series", "television series", "drama", "드라마", "tv"],
  ANIME: ["anime", "animated series", "animated film", "애니메이션", "애니", "series", "tv"],
  COMIC: ["comic", "comic book", "만화"],
  WEBTOON: ["webtoon", "manhwa", "웹툰"],
  WEBNOVEL: ["novel", "web novel", "웹소설", "소설"],
  OTT_ORIGINAL: ["series", "tv series", "original", "웹드라마"],
};

function descriptionMatchesType(description: string | null, contentType: string): boolean {
  if (!description) return false;
  const keywords = CONTENT_TYPE_KEYWORDS[contentType] ?? [];
  const lower = description.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

function extractYear(description: string | null): number | null {
  if (!description) return null;
  const match = description.match(/\b(1[89]\d{2}|20\d{2})\b/);
  return match ? Number(match[0]) : null;
}

function findConfidentCandidate(
  candidates: WikidataSearchCandidate[],
  releaseYear: number,
  contentType: string
): WikidataSearchCandidate | null {
  for (const candidate of candidates) {
    const year = extractYear(candidate.description);
    if (year === null || Math.abs(year - releaseYear) > 1) continue;
    if (!descriptionMatchesType(candidate.description, contentType)) continue;
    return candidate;
  }
  return null;
}

/**
 * Resolves a single confident Wikidata QID for a piece of content, or null
 * if nothing clears the disambiguation bar. Tries `language=ko` first, then
 * falls back to `language=en`. A candidate is only accepted when its
 * description's year is within ±1 of `releaseYear` AND its description type
 * loosely matches `contentType` — getting this wrong links two unrelated
 * works, which is worse than finding nothing, so this deliberately returns
 * null rather than guessing whenever the bar isn't cleared.
 */
export async function searchWikidataEntity(
  title: string,
  releaseYear: number | null,
  contentType: string
): Promise<WikidataSearchCandidate | null> {
  // Without a release year we have no way to confidently verify a
  // candidate's description against the bar above — skip rather than guess.
  if (releaseYear === null) return null;

  const koCandidates = await fetchWbSearchEntities(title, "ko");
  const koMatch = findConfidentCandidate(koCandidates, releaseYear, contentType);
  if (koMatch) return koMatch;

  const enCandidates = await fetchWbSearchEntities(title, "en");
  return findConfidentCandidate(enCandidates, releaseYear, contentType);
}

export interface WikidataClaimRelation {
  targetQid: string;
  label: string | null;
  property: "P144" | "P179";
}

interface WikidataEntity {
  labels?: Record<string, { value: string }>;
  claims?: Record<string, { mainsnak?: { datavalue?: { value?: { id?: string } } } }[]>;
}

interface EntityDataResponse {
  entities?: Record<string, WikidataEntity>;
}

async function fetchEntityData(qid: string): Promise<WikidataEntity | null> {
  const res = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, {
    headers: { "User-Agent": USER_AGENT },
  });
  await sleep(EXTERNAL_REQUEST_DELAY_MS);

  if (!res.ok) {
    console.error(`wikidata EntityData fetch failed (${res.status}) for ${qid}`);
    return null;
  }

  const data = (await res.json()) as EntityDataResponse;
  return data.entities?.[qid] ?? null;
}

function extractClaimTargets(entity: WikidataEntity, property: "P144" | "P179"): string[] {
  const claims = entity.claims?.[property] ?? [];
  return claims
    .map((c) => c.mainsnak?.datavalue?.value?.id)
    .filter((id): id is string => Boolean(id));
}

async function resolveLabels(qids: string[]): Promise<Map<string, string | null>> {
  const labelMap = new Map<string, string | null>();
  if (qids.length === 0) return labelMap;

  const url = new URL(WIKIDATA_API_URL);
  url.searchParams.set("action", "wbgetentities");
  url.searchParams.set("ids", qids.join("|"));
  url.searchParams.set("props", "labels");
  url.searchParams.set("languages", "ko|en");
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString(), { headers: { "User-Agent": USER_AGENT } });
  await sleep(EXTERNAL_REQUEST_DELAY_MS);

  if (!res.ok) {
    console.error(`wikidata wbgetentities failed (${res.status}) for [${qids.join(", ")}]`);
    return labelMap;
  }

  const data = (await res.json()) as EntityDataResponse;
  for (const qid of qids) {
    const labels = data.entities?.[qid]?.labels;
    labelMap.set(qid, labels?.ko?.value ?? labels?.en?.value ?? null);
  }
  return labelMap;
}

/**
 * Looks up P144 (based on) and P179 (part of the series) claims on `qid`
 * and resolves each claim target's label (ko, falling back to en). Returns
 * an empty array if the entity has neither claim, or if it can't be fetched.
 */
export async function fetchWikidataClaims(qid: string): Promise<WikidataClaimRelation[]> {
  const entity = await fetchEntityData(qid);
  if (!entity) return [];

  const adaptationTargets = extractClaimTargets(entity, "P144");
  const universeTargets = extractClaimTargets(entity, "P179");
  const allTargets = Array.from(new Set([...adaptationTargets, ...universeTargets]));
  if (allTargets.length === 0) return [];

  const labels = await resolveLabels(allTargets);

  const relations: WikidataClaimRelation[] = [];
  for (const targetQid of adaptationTargets) {
    relations.push({ targetQid, label: labels.get(targetQid) ?? null, property: "P144" });
  }
  for (const targetQid of universeTargets) {
    relations.push({ targetQid, label: labels.get(targetQid) ?? null, property: "P179" });
  }
  return relations;
}
