import { NextRequest, NextResponse, after } from "next/server";
import { fetchMoviesByVoteCount } from "@/lib/tmdb/client";
import { runTmdbBackfillFromSource, serializeError } from "@/lib/ingestion/ingestTmdbPopular";

export const runtime = "nodejs";
export const maxDuration = 60;

// TMDB's list endpoints (including /discover/movie) always return 20
// results per page — this isn't a tunable "batch size", it's fixed by TMDB.
const TMDB_PAGE_SIZE = 20;
const DEFAULT_TARGET_MOVIES = 5000;
const MAX_TARGET_MOVIES = 10000;

/**
 * Backfills the top-N TMDB movies by vote_count. One request processes as
 * many pages as fit in the Vercel timeout budget, then uses `after()` to
 * fire the next chunk in the background — so a single click keeps the whole
 * backfill going until `target` movies are ingested, instead of requiring
 * the caller to manually resume with the returned `nextPage` each time.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.INGEST_ADMIN_SECRET;
  const providedSecret = request.nextUrl.searchParams.get("secret");

  if (!secret || providedSecret !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? "1"));
  const target = Math.min(
    MAX_TARGET_MOVIES,
    Math.max(1, Number(request.nextUrl.searchParams.get("target") ?? String(DEFAULT_TARGET_MOVIES)))
  );
  const totalPages = Math.ceil(target / TMDB_PAGE_SIZE);
  const remainingPages = totalPages - (page - 1);

  if (remainingPages <= 0) {
    return NextResponse.json({ done: true, page, totalPages, target });
  }

  try {
    const summary = await runTmdbBackfillFromSource(
      fetchMoviesByVoteCount,
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
          console.error("failed to chain backfill-top-movies continuation", serializeError(error));
        }
      });
    }

    return NextResponse.json({ ...summary, totalPages, target, chained: shouldChain });
  } catch (error) {
    return NextResponse.json({ error: serializeError(error) }, { status: 500 });
  }
}
