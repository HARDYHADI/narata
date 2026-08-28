import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createEmbedding } from "@/lib/embeddings/openai";
import { fetchMoviesByIds } from "@/lib/movies/queries";
import { serializeError } from "@/lib/ingestion/ingestTmdbPopular";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_QUERY_LENGTH = 500;
const MATCH_COUNT = 5;

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
      match_count: MATCH_COUNT,
    });

    if (error) throw error;

    const rows = (matches ?? []) as MatchRow[];
    const movies = await fetchMoviesByIds(
      supabase,
      rows.map((row) => row.content_id)
    );

    const results = rows
      .map((row) => {
        const movie = movies.find((m) => m.id === row.content_id);
        if (!movie) return null;
        return {
          ...movie,
          similarity: row.similarity,
          matchedText: row.chunk_text,
        };
      })
      .filter((r) => r !== null);

    return NextResponse.json({ query, results });
  } catch (error) {
    return NextResponse.json({ error: serializeError(error) }, { status: 500 });
  }
}
