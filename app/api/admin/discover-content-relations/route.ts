import { NextRequest, NextResponse, after } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { serializeError } from "@/lib/ingestion/ingestTmdbPopular";
import {
  buildRelationMatchIndexes,
  discoverRelationsForContent,
  type DiscoverableContent,
} from "@/lib/relations/discoverContentRelations";

export const runtime = "nodejs";
export const maxDuration = 60;

const PAGE_SIZE = 40;
// Kept well under maxDuration (60s): the deadline is only checked between
// chunks, and a chunk can take up to PER_ITEM_TIMEOUT_MS (concurrent items
// in a chunk are bounded by the slowest one, not summed) — 40s + 10s worst
// case leaves real margin before Vercel kills the function outright.
const DEADLINE_MS = 40_000;
// Each content row makes up to ~6 sequential external calls (Wikidata
// search/claims, Wikipedia extract, OpenAI extraction), so processing rows
// one at a time only clears 8-15 per 45s window. Running a small batch of
// rows concurrently multiplies that throughput without hammering Wikidata/
// Wikipedia (free, keyless public APIs — see EXTERNAL_REQUEST_DELAY_MS)
// harder than a human clicking around would.
const CONCURRENCY = 8;
// None of the external calls inside discoverRelationsForContent (Wikidata,
// Wikipedia, OpenAI) set their own fetch timeout, so a single hung request
// could previously stall an entire concurrent chunk past the deadline check
// and past Vercel's maxDuration, killing the whole invocation outright
// (observed as a raw Vercel "Serverless Function has timed out" page, with
// no response ever sent — no processed count, no after() continuation).
// Racing each item against this timeout bounds the worst case regardless of
// how many sequential sub-calls it makes internally.
const PER_ITEM_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * Bulk-runs content-relation discovery (Wikidata first, Wikipedia + grounded
 * LLM extraction as a tier-2 fallback — see
 * lib/relations/discoverContentRelations.ts) over every `content` row,
 * ordered by id, paginated via `cursor`. Mirrors
 * synthesize-community-opinion's self-chaining pattern: one request
 * processes as many rows as fit in the time budget, then uses `after()` to
 * fire the next chunk in the background until every row has been visited.
 *
 * Expect a low hit rate on an early run: only MOVIE/DRAMA/ANIME content
 * exists in Narata so far (no webtoon/webnovel ingestion yet), so most real
 * "원작 웹툰/웹소설" cross-media relations can't resolve to anything in our
 * `content` table yet and are silently skipped (this pipeline never creates
 * stub content rows). This mostly finds movie-to-movie relations Wikidata
 * or Wikipedia happen to document today, but activates automatically and
 * for free the moment other media types get ingested.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.INGEST_ADMIN_SECRET;
  const providedSecret = request.nextUrl.searchParams.get("secret");

  if (!secret || providedSecret !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cursor = request.nextUrl.searchParams.get("cursor");

  try {
    const supabase = getSupabaseAdminClient();
    const startedAt = Date.now();
    const indexes = await buildRelationMatchIndexes(supabase);

    let processed = 0;
    let tier1Count = 0;
    let tier2Count = 0;
    let skippedCount = 0;
    let nextCursor: string | null = null;
    let lastId: string | null = cursor;

    for (;;) {
      let query = supabase
        .from("content")
        .select("id, canonical_title, content_type, release_date, wikidata_qid")
        .order("id", { ascending: true })
        .limit(PAGE_SIZE);
      if (lastId) query = query.gt("id", lastId);

      const { data: rows, error } = await query;
      if (error) throw error;

      if (!rows || rows.length === 0) {
        nextCursor = null;
        break;
      }

      const contentRows = rows as DiscoverableContent[];
      for (let i = 0; i < contentRows.length; i += CONCURRENCY) {
        const chunk = contentRows.slice(i, i + CONCURRENCY);
        const results = await Promise.allSettled(
          chunk.map((row) => withTimeout(discoverRelationsForContent(supabase, row, indexes), PER_ITEM_TIMEOUT_MS))
        );

        for (let j = 0; j < chunk.length; j++) {
          const outcome = results[j];
          if (outcome.status === "fulfilled") {
            processed++;
            tier1Count += outcome.value.tier1RelationsCreated;
            tier2Count += outcome.value.tier2RelationsCreated;
            if (outcome.value.tier1RelationsCreated + outcome.value.tier2RelationsCreated === 0) skippedCount++;
          } else {
            // A single content row failing (transient Wikidata/Wikipedia/
            // OpenAI error) shouldn't stop the whole batch — log and move on.
            console.error(`failed to discover relations for ${chunk[j].id}`, serializeError(outcome.reason));
          }
        }
        lastId = chunk[chunk.length - 1].id;

        if (Date.now() - startedAt > DEADLINE_MS) {
          nextCursor = lastId;
          break;
        }
      }

      if (nextCursor || Date.now() - startedAt > DEADLINE_MS) {
        nextCursor = nextCursor ?? lastId;
        break;
      }

      if (rows.length < PAGE_SIZE) {
        // Last page came back short — no more rows to fetch.
        nextCursor = null;
        break;
      }
    }

    if (nextCursor) {
      const nextUrl = request.nextUrl.clone();
      nextUrl.searchParams.set("cursor", nextCursor);
      after(async () => {
        try {
          await fetch(nextUrl.toString());
        } catch (error) {
          console.error("failed to chain discover-content-relations continuation", serializeError(error));
        }
      });
    }

    return NextResponse.json({
      processed,
      skippedCount,
      relationsCreated: tier1Count + tier2Count,
      tier1Count,
      tier2Count,
      nextCursor,
      chained: Boolean(nextCursor),
    });
  } catch (error) {
    return NextResponse.json({ error: serializeError(error) }, { status: 500 });
  }
}
