import { NextRequest, NextResponse, after } from "next/server";
import { fetchTvShowsByVoteCount, fetchAnimeByVoteCount } from "@/lib/tmdb/client";
import { runTmdbTvBackfillFromSource } from "@/lib/ingestion/ingestTmdbTv";
import { serializeError } from "@/lib/ingestion/ingestTmdbPopular";

export const runtime = "nodejs";
export const maxDuration = 60;

// TMDB's list endpoints (including /discover/tv) always return 20 results
// per page — this isn't a tunable "batch size", it's fixed by TMDB.
const TMDB_PAGE_SIZE = 20;
const DEFAULT_TARGET_TV_SHOWS = 1000;
const MAX_TARGET_TV_SHOWS = 10000;

/**
 * Backfills the top-N TMDB TV shows by vote_count, covering both DRAMA and
 * ANIME — each show's content_type is classified automatically per-show
 * (by TMDB genre id 16, Animation) inside the ingestion pipeline, so the
 * caller doesn't pick a type by default. Pass `genre=anime` to restrict the
 * source pool to TMDB's Animation genre instead of the general (drama-heavy
 * by volume) top-TV-by-vote-count list — useful when you specifically want
 * more anime rather than whatever mix comes back from the unfiltered list.
 * One request processes as many pages as fit in the Vercel timeout budget,
 * then uses `after()` to fire the next chunk in the background — so a
 * single click keeps the whole backfill going until `target` shows are
 * ingested, instead of requiring the caller to manually resume with the
 * returned `nextPage` each time. Mirrors /api/admin/backfill-top-movies.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.INGEST_ADMIN_SECRET;
  const providedSecret = request.nextUrl.searchParams.get("secret");

  if (!secret || providedSecret !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? "1"));
  const target = Math.min(
    MAX_TARGET_TV_SHOWS,
    Math.max(
      1,
      Number(request.nextUrl.searchParams.get("target") ?? String(DEFAULT_TARGET_TV_SHOWS))
    )
  );
  const animeOnly = request.nextUrl.searchParams.get("genre") === "anime";
  const totalPages = Math.ceil(target / TMDB_PAGE_SIZE);
  const remainingPages = totalPages - (page - 1);

  if (remainingPages <= 0) {
    return NextResponse.json({ done: true, page, totalPages, target, animeOnly });
  }

  try {
    const summary = await runTmdbTvBackfillFromSource(
      animeOnly ? fetchAnimeByVoteCount : fetchTvShowsByVoteCount,
      page,
      remainingPages,
      TMDB_PAGE_SIZE
    );

    const shouldChain = summary.nextPage !== null && summary.nextPage <= totalPages;

    if (shouldChain && summary.nextPage !== null) {
      const nextUrl = request.nextUrl.clone();
      nextUrl.searchParams.set("page", String(summary.nextPage));
      after(async () => {
        try {
          await fetch(nextUrl.toString());
        } catch (error) {
          console.error("failed to chain backfill-top-tv-shows continuation", serializeError(error));
        }
      });
    }

    return NextResponse.json({ ...summary, totalPages, target, animeOnly, chained: shouldChain });
  } catch (error) {
    return NextResponse.json({ error: serializeError(error) }, { status: 500 });
  }
}
