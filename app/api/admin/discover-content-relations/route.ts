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

const PAGE_SIZE = 20;
const DEADLINE_MS = 45_000;

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

      for (const row of rows as DiscoverableContent[]) {
        try {
          const result = await discoverRelationsForContent(supabase, row, indexes);
          processed++;
          tier1Count += result.tier1RelationsCreated;
          tier2Count += result.tier2RelationsCreated;
          if (result.tier1RelationsCreated + result.tier2RelationsCreated === 0) skippedCount++;
        } catch (error) {
          // A single content row failing (transient Wikidata/Wikipedia/OpenAI
          // error) shouldn't stop the whole batch — log and move on.
          console.error(`failed to discover relations for ${row.id}`, serializeError(error));
        }
        lastId = row.id;

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
