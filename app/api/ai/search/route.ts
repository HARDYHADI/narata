import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createEmbedding } from "@/lib/embeddings/openai";
import { fetchAiCandidateMovies } from "@/lib/movies/queries";
import { rerankCandidates, type RerankCandidate } from "@/lib/ai/rerank";
import { serializeError } from "@/lib/ingestion/ingestTmdbPopular";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_QUERY_LENGTH = 500;
const VECTOR_MATCH_COUNT = 8;

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

    if (movies.length === 0) {
      return NextResponse.json({ query, results: [] });
    }

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

    const results = reranked
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

    return NextResponse.json({ query, results });
  } catch (error) {
    return NextResponse.json({ error: serializeError(error) }, { status: 500 });
  }
}
