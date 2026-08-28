import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "../supabase/admin";
import {
  fetchPopularMovies,
  fetchMovieDetails,
  fetchMovieCredits,
  fetchMovieReleaseDates,
  type TmdbPageFetcher,
} from "../tmdb/client";
import { mapTmdbMovieToContent } from "../tmdb/mapToContent";
import { createEmbedding, EMBEDDING_MODEL } from "../embeddings/openai";
import { buildWorkSummaryChunkText } from "../embeddings/buildWorkSummaryChunk";

const TMDB_SOURCE = "tmdb";

async function upsertGenres(supabase: SupabaseClient, genreNames: string[]) {
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

async function findExistingContentId(supabase: SupabaseClient, tmdbId: number) {
  const { data, error } = await supabase
    .from("external_identifier")
    .select("content_id")
    .eq("source", TMDB_SOURCE)
    .eq("external_id", String(tmdbId))
    .maybeSingle();

  if (error) throw error;
  return data?.content_id as string | undefined;
}

async function ingestMovie(supabase: SupabaseClient, tmdbId: number) {
  const [movie, credits, releaseDates] = await Promise.all([
    fetchMovieDetails(tmdbId),
    fetchMovieCredits(tmdbId),
    fetchMovieReleaseDates(tmdbId),
  ]);
  const contentRow = mapTmdbMovieToContent(movie, credits, releaseDates);
  const genreNames = movie.genres.map((g) => g.name);
  const genreMap = await upsertGenres(supabase, genreNames);

  const existingContentId = await findExistingContentId(supabase, tmdbId);
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

const INGEST_CONCURRENCY = 8;

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

  const results: IngestResult[] = [];

  for (let i = 0; i < movies.length; i += INGEST_CONCURRENCY) {
    const batch = movies.slice(i, i + INGEST_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((movie) => ingestOne(supabase, movie.id))
    );
    results.push(...batchResults);
  }

  return results;
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

const DEFAULT_BACKFILL_DEADLINE_MS = 45_000;

/**
 * Ingests multiple pages from a TMDB list source in one call, stopping
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
  const startedAt = Date.now();
  const results: IngestResult[] = [];
  let completedPages = 0;
  let page = startPage;

  for (; page < startPage + pageCount; page++) {
    const pageResults = await runTmdbIngestion(fetchPage, page, limit);
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

export async function runTmdbBackfill(
  startPage: number,
  pageCount: number,
  limit: number,
  deadlineMs = DEFAULT_BACKFILL_DEADLINE_MS
): Promise<BackfillSummary> {
  return runTmdbBackfillFromSource(fetchPopularMovies, startPage, pageCount, limit, deadlineMs);
}
