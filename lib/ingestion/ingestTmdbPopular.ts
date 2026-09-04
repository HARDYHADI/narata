import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "../supabase/admin";
import {
  fetchPopularMovies,
  fetchMovieDetails,
  fetchMovieCredits,
  fetchMovieReleaseDates,
  fetchMovieVideos,
  fetchMovieWatchProviders,
  TMDB_IMAGE_BASE_URL,
  type TmdbPageFetcher,
  type TmdbVideo,
  type TmdbWatchProvidersResponse,
} from "../tmdb/client";
import { mapTmdbMovieToContent } from "../tmdb/mapToContent";
import { createEmbedding, EMBEDDING_MODEL } from "../embeddings/openai";
import { buildWorkSummaryChunkText } from "../embeddings/buildWorkSummaryChunk";

// Movie TMDB ids and TV TMDB ids are separate id spaces — a movie and a TV
// show can share the same numeric id. Keep this exact value untouched (it's
// matched against 100+ already-ingested movies via external_identifier on
// every re-ingestion run); TV ingestion uses its own distinct source value
// (see TMDB_TV_SOURCE in ingestTmdbTv.ts) so the two never collide.
const TMDB_SOURCE = "tmdb";

// Shared across movie and TV ingestion (see ingestTmdbTv.ts).
export async function upsertGenres(supabase: SupabaseClient, genreNames: string[]) {
  if (genreNames.length === 0) return new Map<string, string>();

  const { data, error } = await supabase
    .from("genre")
    .upsert(
      genreNames.map((name) => ({ name })),
      { onConflict: "name" }
    )
    .select("id, name");

  if (error) throw error;

  return new Map((data ?? []).map((g) => [g.name as string, g.id as string]));
}

type ContentVideoType = "TRAILER" | "TEASER" | "INTERVIEW" | "OST" | "CLIP";

function mapTmdbVideoType(video: TmdbVideo): ContentVideoType {
  const name = video.name.toLowerCase();
  if (name.includes("ost") || name.includes("music") || name.includes("soundtrack")) {
    return "OST";
  }
  if (name.includes("interview") || name.includes("인터뷰")) {
    return "INTERVIEW";
  }

  switch (video.type) {
    case "Trailer":
      return "TRAILER";
    case "Teaser":
      return "TEASER";
    default:
      return "CLIP";
  }
}

// Shared across movie and TV ingestion (see ingestTmdbTv.ts).
export function buildContentVideoRows(contentId: string, videos: TmdbVideo[]) {
  return videos
    .filter((v) => v.site === "YouTube")
    .map((v) => ({
      content_id: contentId,
      video_type: mapTmdbVideoType(v),
      title: v.name,
      url: `https://www.youtube.com/watch?v=${v.key}`,
      provider_label: "YouTube",
      duration_seconds: null,
      published_at: v.published_at || null,
    }));
}

type WatchProviderRegionType = "STREAMING" | "RENT" | "BUY";

// Shared across movie and TV ingestion (see ingestTmdbTv.ts).
export interface KrWatchProviderEntry {
  provider_name: string;
  type: WatchProviderRegionType;
  logo_path: string | null;
}

// Shared across movie and TV ingestion (see ingestTmdbTv.ts).
export const WATCH_PROVIDER_REGION = "KR";
const WATCH_PROVIDER_LIST_TYPES: Array<["flatrate" | "rent" | "buy", WatchProviderRegionType]> = [
  ["flatrate", "STREAMING"],
  ["rent", "RENT"],
  ["buy", "BUY"],
];

export function collectKrWatchProviderEntries(
  watchProviders: TmdbWatchProvidersResponse
): { entries: KrWatchProviderEntry[]; link: string | null } {
  const kr = watchProviders.results[WATCH_PROVIDER_REGION];
  if (!kr) return { entries: [], link: null };

  const entries: KrWatchProviderEntry[] = [];
  for (const [listKey, type] of WATCH_PROVIDER_LIST_TYPES) {
    for (const p of kr[listKey] ?? []) {
      entries.push({ provider_name: p.provider_name, type, logo_path: p.logo_path });
    }
  }

  return { entries, link: kr.link ?? null };
}

// Shared across movie and TV ingestion (see ingestTmdbTv.ts).
export async function upsertWatchProviders(
  supabase: SupabaseClient,
  entries: KrWatchProviderEntry[]
) {
  if (entries.length === 0) return new Map<string, string>();

  const logoByName = new Map<string, string | null>();
  for (const entry of entries) {
    if (!logoByName.has(entry.provider_name)) {
      logoByName.set(entry.provider_name, entry.logo_path);
    }
  }

  const rows = Array.from(logoByName.entries()).map(([name, logoPath]) => ({
    name,
    logo_url: logoPath ? `${TMDB_IMAGE_BASE_URL}${logoPath}` : null,
  }));

  const { data, error } = await supabase
    .from("watch_provider")
    .upsert(rows, { onConflict: "name" })
    .select("id, name");

  if (error) throw error;

  return new Map((data ?? []).map((p) => [p.name as string, p.id as string]));
}

// Shared across movie and TV ingestion (see ingestTmdbTv.ts). `source` must
// be distinct per external id space (movies use TMDB_SOURCE = "tmdb", TV
// uses its own TMDB_TV_SOURCE) — TMDB movie and TV ids can collide numerically.
export async function findExistingContentId(
  supabase: SupabaseClient,
  source: string,
  tmdbId: number
) {
  const { data, error } = await supabase
    .from("external_identifier")
    .select("content_id")
    .eq("source", source)
    .eq("external_id", String(tmdbId))
    .maybeSingle();

  if (error) throw error;
  return data?.content_id as string | undefined;
}

async function ingestMovie(supabase: SupabaseClient, tmdbId: number) {
  const [movie, credits, releaseDates, videos, watchProviders] = await Promise.all([
    fetchMovieDetails(tmdbId),
    fetchMovieCredits(tmdbId),
    fetchMovieReleaseDates(tmdbId),
    fetchMovieVideos(tmdbId),
    fetchMovieWatchProviders(tmdbId),
  ]);
  const contentRow = mapTmdbMovieToContent(movie, credits, releaseDates);
  const genreNames = movie.genres.map((g) => g.name);
  const genreMap = await upsertGenres(supabase, genreNames);

  const existingContentId = await findExistingContentId(supabase, TMDB_SOURCE, tmdbId);
  let contentId: string;

  if (existingContentId) {
    const { error } = await supabase
      .from("content")
      .update(contentRow)
      .eq("id", existingContentId);
    if (error) throw error;
    contentId = existingContentId;
  } else {
    const { data, error } = await supabase
      .from("content")
      .insert(contentRow)
      .select("id")
      .single();
    if (error) throw error;
    contentId = data.id as string;

    const { error: extError } = await supabase.from("external_identifier").insert({
      content_id: contentId,
      source: TMDB_SOURCE,
      external_id: String(tmdbId),
      raw_payload: movie,
    });
    if (extError) throw extError;
  }

  if (contentRow.original_title) {
    const { error } = await supabase.from("content_alias").upsert(
      {
        content_id: contentId,
        alias_title: contentRow.original_title,
        alias_type: "TRANSLATED",
      },
      { onConflict: "content_id,alias_title" }
    );
    if (error) throw error;
  }

  const genreIds = genreNames
    .map((name) => genreMap.get(name))
    .filter((id): id is string => Boolean(id));

  if (genreIds.length > 0) {
    const { error } = await supabase.from("content_genre").upsert(
      genreIds.map((genreId) => ({ content_id: contentId, genre_id: genreId })),
      { onConflict: "content_id,genre_id" }
    );
    if (error) throw error;
  }

  const { entries: watchProviderEntries, link: watchProviderLink } =
    collectKrWatchProviderEntries(watchProviders);
  const watchProviderMap = await upsertWatchProviders(supabase, watchProviderEntries);

  const contentWatchProviderRows = watchProviderEntries
    .map((entry) => {
      const providerId = watchProviderMap.get(entry.provider_name);
      if (!providerId) return null;
      return {
        content_id: contentId,
        provider_id: providerId,
        country_code: WATCH_PROVIDER_REGION,
        type: entry.type,
        url: watchProviderLink,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (contentWatchProviderRows.length > 0) {
    const { error } = await supabase
      .from("content_watch_provider")
      .upsert(contentWatchProviderRows, {
        onConflict: "content_id,provider_id,country_code,type",
      });
    if (error) throw error;
  }

  const contentVideoRows = buildContentVideoRows(contentId, videos.results);

  await supabase.from("content_video").delete().eq("content_id", contentId);

  if (contentVideoRows.length > 0) {
    const { error } = await supabase.from("content_video").insert(contentVideoRows);
    if (error) throw error;
  }

  const chunkText = buildWorkSummaryChunkText({
    canonicalTitle: contentRow.canonical_title,
    originalTitle: contentRow.original_title,
    synopsisShort: contentRow.synopsis_short,
    genreNames,
    releaseDate: contentRow.release_date,
    director: contentRow.director,
    castNames: contentRow.cast_names,
  });

  const embedding = await createEmbedding(chunkText);

  await supabase
    .from("embedding_document")
    .delete()
    .eq("content_id", contentId)
    .eq("chunk_type", "WORK_SUMMARY");

  const { error: embedError } = await supabase.from("embedding_document").insert({
    content_id: contentId,
    chunk_type: "WORK_SUMMARY",
    chunk_text: chunkText,
    embedding,
    embedding_model: EMBEDDING_MODEL,
    embedding_version: "v1",
    source_id: TMDB_SOURCE,
    source_record_id: String(tmdbId),
  });
  if (embedError) throw embedError;

  return { tmdbId, contentId, title: contentRow.canonical_title };
}

export interface IngestResult {
  tmdbId: number;
  contentId?: string;
  title?: string;
  error?: string;
}

export function serializeError(error: unknown): string {
  if (error instanceof Error) return error.message;

  if (error && typeof error === "object") {
    const withMessage = error as { message?: unknown };
    if (typeof withMessage.message === "string") return withMessage.message;
    try {
      return JSON.stringify(error);
    } catch {
      // fall through
    }
  }

  return String(error);
}

// Shared across movie and TV ingestion (see ingestTmdbTv.ts).
export const INGEST_CONCURRENCY = 8;

/**
 * Runs `ingestOneFn` over `tmdbIds` in fixed-size concurrent batches,
 * collecting per-id results (including per-id errors, which don't abort
 * the batch). Shared by movie and TV ingestion (see ingestTmdbTv.ts).
 */
export async function runIngestionInBatches(
  tmdbIds: number[],
  ingestOneFn: (tmdbId: number) => Promise<IngestResult>
): Promise<IngestResult[]> {
  const results: IngestResult[] = [];

  for (let i = 0; i < tmdbIds.length; i += INGEST_CONCURRENCY) {
    const batch = tmdbIds.slice(i, i + INGEST_CONCURRENCY);
    const batchResults = await Promise.all(batch.map(ingestOneFn));
    results.push(...batchResults);
  }

  return results;
}

async function ingestOne(supabase: SupabaseClient, tmdbId: number): Promise<IngestResult> {
  try {
    return await ingestMovie(supabase, tmdbId);
  } catch (error) {
    return { tmdbId, error: serializeError(error) };
  }
}

export async function runTmdbIngestion(
  fetchPage: TmdbPageFetcher,
  page = 1,
  limit = 20
): Promise<IngestResult[]> {
  const supabase = getSupabaseAdminClient();
  const listPage = await fetchPage(page);
  const movies = listPage.results.slice(0, limit);

  return runIngestionInBatches(
    movies.map((movie) => movie.id),
    (tmdbId) => ingestOne(supabase, tmdbId)
  );
}

export async function runTmdbPopularIngestion(
  page = 1,
  limit = 20
): Promise<IngestResult[]> {
  return runTmdbIngestion(fetchPopularMovies, page, limit);
}

export interface BackfillSummary {
  startPage: number;
  requestedPages: number;
  completedPages: number;
  /** Page to pass as `page` on the next call to finish the remaining range, or null if done. */
  nextPage: number | null;
  results: IngestResult[];
}

// Now that every external fetch this pipeline makes (TMDB, and OpenAI/
// Wikidata/Wikipedia elsewhere) carries its own AbortSignal.timeout, a
// single page's worst-case time is bounded rather than unbounded — but the
// deadline here is only checked between pages, so this still leaves a
// margin below Vercel's 60s maxDuration for a worst-case last page.
export const DEFAULT_BACKFILL_DEADLINE_MS = 35_000;

/**
 * Runs `runPage(page, limit)` for consecutive pages starting at `startPage`,
 * stopping before the Vercel function timeout if the full range won't fit.
 * `nextPage` in the response tells the caller where to resume. Shared by
 * movie and TV backfill (see ingestTmdbTv.ts) — each just supplies its own
 * per-page ingestion function.
 */
export async function runBackfillLoop(
  runPage: (page: number, limit: number) => Promise<IngestResult[]>,
  startPage: number,
  pageCount: number,
  limit: number,
  deadlineMs = DEFAULT_BACKFILL_DEADLINE_MS
): Promise<BackfillSummary> {
  const startedAt = Date.now();
  const results: IngestResult[] = [];
  let completedPages = 0;
  let page = startPage;

  for (; page < startPage + pageCount; page++) {
    const pageResults = await runPage(page, limit);
    results.push(...pageResults);
    completedPages++;

    if (Date.now() - startedAt > deadlineMs) {
      page++;
      break;
    }
  }

  const nextPage = completedPages < pageCount ? page : null;

  return {
    startPage,
    requestedPages: pageCount,
    completedPages,
    nextPage,
    results,
  };
}

/**
 * Ingests multiple pages from a TMDB movie list source in one call, stopping
 * before the Vercel function timeout if the full range won't fit.
 * `nextPage` in the response tells the caller where to resume.
 */
export async function runTmdbBackfillFromSource(
  fetchPage: TmdbPageFetcher,
  startPage: number,
  pageCount: number,
  limit: number,
  deadlineMs = DEFAULT_BACKFILL_DEADLINE_MS
): Promise<BackfillSummary> {
  return runBackfillLoop(
    (page, lim) => runTmdbIngestion(fetchPage, page, lim),
    startPage,
    pageCount,
    limit,
    deadlineMs
  );
}

export async function runTmdbBackfill(
  startPage: number,
  pageCount: number,
  limit: number,
  deadlineMs = DEFAULT_BACKFILL_DEADLINE_MS
): Promise<BackfillSummary> {
  return runTmdbBackfillFromSource(fetchPopularMovies, startPage, pageCount, limit, deadlineMs);
}
