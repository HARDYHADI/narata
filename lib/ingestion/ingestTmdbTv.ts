import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "../supabase/admin";
import {
  fetchPopularTvShows,
  fetchTvShowsByVoteCount,
  fetchTvShowDetails,
  fetchTvShowCredits,
  fetchTvShowContentRatings,
  fetchTvShowVideos,
  fetchTvShowWatchProviders,
  type TmdbTvPageFetcher,
} from "../tmdb/client";
import { mapTmdbTvToContent } from "../tmdb/mapTvToContent";
import { createEmbedding, EMBEDDING_MODEL } from "../embeddings/openai";
import { buildWorkSummaryChunkText } from "../embeddings/buildWorkSummaryChunk";
import {
  upsertGenres,
  buildContentVideoRows,
  collectKrWatchProviderEntries,
  upsertWatchProviders,
  findExistingContentId,
  runIngestionInBatches,
  runBackfillLoop,
  serializeError,
  WATCH_PROVIDER_REGION,
  DEFAULT_BACKFILL_DEADLINE_MS,
  type IngestResult,
  type BackfillSummary,
} from "./ingestTmdbPopular";

// Distinct from the movie ingestion's `TMDB_SOURCE = "tmdb"` — TMDB movie
// ids and TV ids are separate id spaces and can collide numerically, so
// external_identifier lookups must never share a source value between them.
const TMDB_TV_SOURCE = "tmdb_tv";

async function ingestTvShow(supabase: SupabaseClient, tmdbId: number) {
  const [tv, credits, contentRatings, videos, watchProviders] = await Promise.all([
    fetchTvShowDetails(tmdbId),
    fetchTvShowCredits(tmdbId),
    fetchTvShowContentRatings(tmdbId),
    fetchTvShowVideos(tmdbId),
    fetchTvShowWatchProviders(tmdbId),
  ]);
  const contentRow = mapTmdbTvToContent(tv, credits, contentRatings);
  const genreNames = tv.genres.map((g) => g.name);
  const genreMap = await upsertGenres(supabase, genreNames);

  const existingContentId = await findExistingContentId(supabase, TMDB_TV_SOURCE, tmdbId);
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
      source: TMDB_TV_SOURCE,
      external_id: String(tmdbId),
      raw_payload: tv,
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
    source_id: TMDB_TV_SOURCE,
    source_record_id: String(tmdbId),
  });
  if (embedError) throw embedError;

  return { tmdbId, contentId, title: contentRow.canonical_title };
}

async function ingestOneTv(supabase: SupabaseClient, tmdbId: number): Promise<IngestResult> {
  try {
    return await ingestTvShow(supabase, tmdbId);
  } catch (error) {
    return { tmdbId, error: serializeError(error) };
  }
}

export async function runTmdbTvIngestion(
  fetchPage: TmdbTvPageFetcher,
  page = 1,
  limit = 20
): Promise<IngestResult[]> {
  const supabase = getSupabaseAdminClient();
  const listPage = await fetchPage(page);
  const shows = listPage.results.slice(0, limit);

  return runIngestionInBatches(
    shows.map((show) => show.id),
    (tmdbId) => ingestOneTv(supabase, tmdbId)
  );
}

export async function runTmdbTvPopularIngestion(
  page = 1,
  limit = 20
): Promise<IngestResult[]> {
  return runTmdbTvIngestion(fetchPopularTvShows, page, limit);
}

/**
 * Ingests multiple pages from a TMDB TV list source in one call, stopping
 * before the Vercel function timeout if the full range won't fit.
 * `nextPage` in the response tells the caller where to resume. DRAMA vs
 * ANIME classification happens per-show inside mapTmdbTvToContent — this
 * doesn't take a content-type param.
 */
export async function runTmdbTvBackfillFromSource(
  fetchPage: TmdbTvPageFetcher,
  startPage: number,
  pageCount: number,
  limit: number,
  deadlineMs = DEFAULT_BACKFILL_DEADLINE_MS
): Promise<BackfillSummary> {
  return runBackfillLoop(
    (page, lim) => runTmdbTvIngestion(fetchPage, page, lim),
    startPage,
    pageCount,
    limit,
    deadlineMs
  );
}

export async function runTmdbTvBackfill(
  startPage: number,
  pageCount: number,
  limit: number,
  deadlineMs = DEFAULT_BACKFILL_DEADLINE_MS
): Promise<BackfillSummary> {
  return runTmdbTvBackfillFromSource(
    fetchTvShowsByVoteCount,
    startPage,
    pageCount,
    limit,
    deadlineMs
  );
}
