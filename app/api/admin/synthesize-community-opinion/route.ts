import { NextRequest, NextResponse, after } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { serializeError } from "@/lib/ingestion/ingestTmdbPopular";
import { synthesizeCommunityOpinion } from "@/lib/embeddings/synthesizeCommunityOpinion";

export const runtime = "nodejs";
export const maxDuration = 60;

const PAGE_SIZE = 50;
const DEADLINE_MS = 45_000;

/**
 * Bulk-runs community-opinion synthesis over every `content` row, ordered by
 * id, paginated via `cursor`. One request processes as many rows as fit in
 * the time budget, then self-chains via `after()` (same pattern as
 * backfill-top-movies) until every row has been visited.
 *
 * Right now this will skip almost everything: there's no login UI yet, so
 * essentially no reviews/comments/tag-votes exist. That's expected — run it
 * again once real community data exists.
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

    let processed = 0;
    let skipped = 0;
    let chunksWritten = 0;
    let nextCursor: string | null = null;
    let lastId: string | null = cursor;

    for (;;) {
      let query = supabase
        .from("content")
        .select("id")
        .order("id", { ascending: true })
        .limit(PAGE_SIZE);
      if (lastId) query = query.gt("id", lastId);

      const { data: rows, error } = await query;
      if (error) throw error;

      if (!rows || rows.length === 0) {
        // Reached the end of `content` — nothing left to chain.
        nextCursor = null;
        break;
      }

      for (const row of rows) {
        const contentId = row.id as string;
        try {
          const result = await synthesizeCommunityOpinion(contentId);
          processed++;
          if (result.skipped) {
            skipped++;
          } else {
            chunksWritten += result.chunksWritten;
          }
        } catch (error) {
          // A single movie failing (e.g. transient OpenAI error) shouldn't
          // stop the whole backfill — log and move on.
          console.error(`failed to synthesize community opinion for ${contentId}`, serializeError(error));
        }
        lastId = contentId;

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
          console.error(
            "failed to chain synthesize-community-opinion continuation",
            serializeError(error)
          );
        }
      });
    }

    return NextResponse.json({ processed, skipped, chunksWritten, nextCursor, chained: Boolean(nextCursor) });
  } catch (error) {
    return NextResponse.json({ error: serializeError(error) }, { status: 500 });
  }
}
