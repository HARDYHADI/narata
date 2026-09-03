import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createEmbedding } from "@/lib/embeddings/openai";
import { fetchAiCandidateMovies } from "@/lib/movies/queries";
import { rerankCandidates, type RerankCandidate } from "@/lib/ai/rerank";
import { serializeError } from "@/lib/ingestion/ingestTmdbPopular";
import { checkRateLimit, resolveBucketKey } from "@/lib/rate-limit";
import { getRequestIp, hashIp } from "@/lib/community/guest";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_QUERY_LENGTH = 500;
const VECTOR_MATCH_COUNT = 8;
const RATE_LIMIT_ROUTE = "ai_search";
const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MINUTES = 10;

// Resolves the caller's user id (if any) from a bearer access token, shared
// by the rate-limit bucket key and the search-log row so both agree on who
// made the request.
async function resolveUserId(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  request: NextRequest
): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) return null;

  const token = authHeader.slice(7).trim();
  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  return user?.id ?? null;
}

interface MatchRow {
  content_id: string;
  chunk_text: string;
  similarity: number;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query.trim() : "";

  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `query must be ${MAX_QUERY_LENGTH} characters or fewer` },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdminClient();
    const userId = await resolveUserId(supabase, request);
    const ipHash = hashIp(getRequestIp(request));
    const bucketKey = resolveBucketKey(userId, ipHash);

    const rateLimit = await checkRateLimit(
      supabase,
      bucketKey,
      RATE_LIMIT_ROUTE,
      RATE_LIMIT_MAX_REQUESTS,
      RATE_LIMIT_WINDOW_MINUTES
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "요청이 너무 많아요. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds ?? 60) } }
      );
    }

    const embedding = await createEmbedding(query);

    const { data: matches, error } = await supabase.rpc("match_movie_embeddings", {
      query_embedding: embedding,
      match_count: VECTOR_MATCH_COUNT,
    });

    if (error) throw error;

    const matchRows = (matches ?? []) as MatchRow[];
    const movies = await fetchAiCandidateMovies(
      supabase,
      matchRows.map((row) => row.content_id)
    );

    let results: {
      id: string;
      canonical_title: string;
      release_date: string | null;
      poster_url: string | null;
      confidence: number;
      reason: string;
    }[] = [];

    if (movies.length > 0) {
      const candidates: RerankCandidate[] = movies.map((movie) => ({
        id: movie.id,
        title: movie.canonical_title,
        genres: movie.content_genre.map((cg) => cg.genre?.name).filter((n): n is string => Boolean(n)),
        synopsis: movie.synopsis_short,
        director: movie.director,
        castNames: movie.cast_names,
        releaseYear: movie.release_date?.slice(0, 4) ?? null,
      }));

      let reranked;
      try {
        reranked = await rerankCandidates(query, candidates);
      } catch (rerankError) {
        console.error("rerank failed, falling back to vector order", rerankError);
        reranked = matchRows.map((row) => ({
          id: row.content_id,
          confidence: Math.min(100, Math.max(0, Math.round(row.similarity * 100))),
          reason: "작품 설명과 의미적으로 유사한 후보예요.",
        }));
      }

      results = reranked
        .map((r) => {
          const movie = movies.find((m) => m.id === r.id);
          if (!movie) return null;
          return {
            id: movie.id,
            canonical_title: movie.canonical_title,
            release_date: movie.release_date,
            poster_url: movie.poster_url,
            confidence: r.confidence,
            reason: r.reason,
          };
        })
        .filter((r) => r !== null);
    }

    const searchLogId = await logAiSearch(supabase, userId, query, results.length);

    return NextResponse.json({ query, results, search_log_id: searchLogId });
  } catch (error) {
    return NextResponse.json({ error: serializeError(error) }, { status: 500 });
  }
}

// Inserts an ai_search_log row. Anonymous searches are logged with a null
// user_id. Logging failures never break the search response itself.
async function logAiSearch(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  userId: string | null,
  queryText: string,
  resultCount: number
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("ai_search_log")
      .insert({ user_id: userId, query_text: queryText, result_count: resultCount })
      .select("id")
      .single();

    if (error) throw error;
    return data.id as string;
  } catch (error) {
    console.error("failed to log AI search", error);
    return null;
  }
}
