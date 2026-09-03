import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createEmbedding } from "@/lib/embeddings/openai";
import { serializeError } from "@/lib/ingestion/ingestTmdbPopular";
import { checkRateLimit, resolveBucketKey } from "@/lib/rate-limit";
import { getRequestIp, hashIp } from "@/lib/community/guest";

export const runtime = "nodejs";
export const maxDuration = 30;

const CHAT_MODEL = "gpt-4o-mini";
const MAX_QUESTION_LENGTH = 500;
const VECTOR_MATCH_COUNT = 6;
const RATE_LIMIT_ROUTE = "ai_ask";
const RATE_LIMIT_MAX_REQUESTS = 15;
const RATE_LIMIT_WINDOW_MINUTES = 10;

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
  id: string;
  chunk_type: string;
  chunk_text: string;
  similarity: number;
}

const SUBJECTIVE_FALLBACK_NOTE =
  '아직 이 작품에 대한 사용자 데이터(리뷰, 댓글, 태그 투표)가 충분하지 않아요. 확실하지 않은 부분은 "아직 이 작품에 대한 사용자 데이터가 충분하지 않아요"처럼 솔직하게 답하고, 시놉시스만으로 주관적 판단(재미 여부, 무섭거나 선정적인지, 스포일러 반전 등)을 지어내지 마세요.';

function buildSystemPrompt(title: string, hasCommunityData: boolean): string {
  const base = `당신은 영화/드라마 커뮤니티 플랫폼 나라타(Narata)의 AI 어시스턴트입니다. 사용자가 "${title}"에 대해 질문하면, 아래에 제공된 컨텍스트(작품 정보 및 커뮤니티 데이터에서 추출한 조각들)만 근거로 답하세요. 컨텍스트에 없는 내용은 추측하거나 지어내지 말고, 모르면 모른다고 답하세요. 한국어로, 2~5문장 정도로 간결하게 답하세요.`;

  return hasCommunityData ? base : `${base}\n\n${SUBJECTIVE_FALLBACK_NOTE}`;
}

function buildUserPrompt(question: string, chunks: MatchRow[]): string {
  const context = chunks
    .map((c, i) => `[${i + 1}] (${c.chunk_type})\n${c.chunk_text}`)
    .join("\n\n");

  return `질문: ${question}\n\n컨텍스트:\n${context || "(관련 정보 없음)"}`;
}

async function callAskLlm(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI chat completion failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI chat completion returned no content");
  }

  return content.trim();
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const contentId = typeof body?.content_id === "string" ? body.content_id.trim() : "";
  const question = typeof body?.question === "string" ? body.question.trim() : "";

  if (!contentId) {
    return NextResponse.json({ error: "content_id is required" }, { status: 400 });
  }
  if (!question) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json(
      { error: `question must be ${MAX_QUESTION_LENGTH} characters or fewer` },
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

    const { data: content, error: contentError } = await supabase
      .from("content")
      .select("canonical_title")
      .eq("id", contentId)
      .maybeSingle();
    if (contentError) throw contentError;
    if (!content) {
      return NextResponse.json({ error: "content not found" }, { status: 404 });
    }

    const embedding = await createEmbedding(question);

    const { data: matches, error: matchError } = await supabase.rpc("match_content_embeddings", {
      query_embedding: embedding,
      p_content_id: contentId,
      match_count: VECTOR_MATCH_COUNT,
    });
    if (matchError) throw matchError;

    const chunks = (matches ?? []) as MatchRow[];
    const chunkTypesUsed = Array.from(new Set(chunks.map((c) => c.chunk_type)));
    const hasCommunityData = chunkTypesUsed.some(
      (t) => t === "COMMUNITY_OPINION" || t === "CONTENT_ADVISORY"
    );

    const title = content.canonical_title as string;
    const answer = await callAskLlm(
      buildSystemPrompt(title, hasCommunityData),
      buildUserPrompt(question, chunks)
    );

    return NextResponse.json({ answer, chunkTypesUsed });
  } catch (error) {
    return NextResponse.json({ error: serializeError(error) }, { status: 500 });
  }
}
