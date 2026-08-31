import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "../supabase/admin";
import { createEmbedding, EMBEDDING_MODEL } from "./openai";
import { fetchContentTagVotePercentages, type TagVotePercentage } from "../reviews/queries";

const CHAT_MODEL = "gpt-4o-mini";
const SYNTHESIS_SOURCE = "community_synthesis";

// Below this many reviews+comments combined, there simply isn't enough
// community signal to synthesize an honest summary — skip rather than force
// a chunk out of near-empty data (see AGENTS/PR notes: this app never
// fabricates numbers or opinions it doesn't have).
const MIN_SAMPLE_SIZE = 10;

interface ReviewText {
  body: string;
  containsSpoiler: boolean;
  score: number | null;
}

interface CommentText {
  body: string;
}

interface ConfirmedQuery {
  queryText: string;
}

async function fetchReviewTexts(
  supabase: SupabaseClient,
  contentId: string
): Promise<{ reviewIds: string[]; reviews: ReviewText[] }> {
  const { data, error } = await supabase
    .from("review")
    .select("id, body, contains_spoiler, content_rating(score)")
    .eq("content_id", contentId)
    .eq("is_hidden", false);

  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    id: string;
    body: string;
    contains_spoiler: boolean;
    content_rating: { score: number } | null;
  }[];

  return {
    reviewIds: rows.map((r) => r.id),
    reviews: rows.map((r) => ({
      body: r.body,
      containsSpoiler: r.contains_spoiler,
      score: r.content_rating?.score ?? null,
    })),
  };
}

async function fetchReviewComments(
  supabase: SupabaseClient,
  reviewIds: string[]
): Promise<CommentText[]> {
  if (reviewIds.length === 0) return [];

  const { data, error } = await supabase
    .from("comment")
    .select("body")
    .in("review_id", reviewIds)
    .eq("is_hidden", false);

  if (error) throw error;
  return (data ?? []) as CommentText[];
}

// Comments on posts in this content's gallery (post -> gallery -> content_id).
async function fetchGalleryPostComments(
  supabase: SupabaseClient,
  contentId: string
): Promise<CommentText[]> {
  const { data: galleries, error: galleryError } = await supabase
    .from("gallery")
    .select("id")
    .eq("content_id", contentId);
  if (galleryError) throw galleryError;

  const galleryIds = (galleries ?? []).map((g) => g.id as string);
  if (galleryIds.length === 0) return [];

  const { data: posts, error: postsError } = await supabase
    .from("post")
    .select("id")
    .in("gallery_id", galleryIds)
    .eq("is_hidden", false);
  if (postsError) throw postsError;

  const postIds = (posts ?? []).map((p) => p.id as string);
  if (postIds.length === 0) return [];

  const { data: comments, error: commentsError } = await supabase
    .from("comment")
    .select("body")
    .in("post_id", postIds)
    .eq("is_hidden", false);
  if (commentsError) throw commentsError;

  return (comments ?? []) as CommentText[];
}

// Search queries users explicitly confirmed matched this movie — a strong,
// low-noise signal of how people actually describe it.
async function fetchConfirmedSearchQueries(
  supabase: SupabaseClient,
  contentId: string
): Promise<ConfirmedQuery[]> {
  const { data, error } = await supabase
    .from("ai_search_result_feedback")
    .select("ai_search_log(query_text)")
    .eq("content_id", contentId)
    .eq("feedback", "RELEVANT");

  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    ai_search_log: { query_text: string } | null;
  }[];

  return rows
    .filter((r): r is { ai_search_log: { query_text: string } } => Boolean(r.ai_search_log?.query_text))
    .map((r) => ({ queryText: r.ai_search_log.query_text }));
}

async function fetchContentTitle(supabase: SupabaseClient, contentId: string): Promise<string> {
  const { data, error } = await supabase
    .from("content")
    .select("canonical_title")
    .eq("id", contentId)
    .maybeSingle();

  if (error) throw error;
  return (data?.canonical_title as string | undefined) ?? "이 작품";
}

function buildSynthesisPrompt(params: {
  title: string;
  reviews: ReviewText[];
  comments: CommentText[];
  moodTags: TagVotePercentage[];
  advisoryTags: TagVotePercentage[];
  confirmedQueries: ConfirmedQuery[];
}): string {
  const { title, reviews, comments, moodTags, advisoryTags, confirmedQueries } = params;

  const reviewLines =
    reviews
      .map((r, i) => {
        const scoreLabel = r.score !== null ? `평점 ${r.score}` : "평점 정보 없음";
        const spoilerLabel = r.containsSpoiler ? ", 스포일러 포함" : "";
        return `${i + 1}. [${scoreLabel}${spoilerLabel}] ${r.body}`;
      })
      .join("\n") || "(리뷰 없음)";

  const commentLines = comments.map((c, i) => `${i + 1}. ${c.body}`).join("\n") || "(댓글 없음)";

  const moodTagLines =
    moodTags.map((t) => `- ${t.name}: ${t.percentage}% (${t.votes}표)`).join("\n") ||
    "(무드 태그 투표 없음)";

  const advisoryTagLines =
    advisoryTags.map((t) => `- ${t.name}: ${t.percentage}% (${t.votes}표)`).join("\n") ||
    "(주의사항 태그 투표 없음)";

  const confirmedQueryLines =
    confirmedQueries.map((q) => `- "${q.queryText}"`).join("\n") || "(확인된 검색어 없음)";

  return `다음은 "${title}"에 대한 나라타(Narata) 커뮤니티 데이터입니다. 사용자 리뷰, 댓글, 태그 투표 결과, 그리고 AI 검색에서 사용자가 이 작품과 일치한다고 직접 확인한 검색어입니다. 닉네임 등 개인 식별 정보는 이미 제거되어 있습니다.

[리뷰]
${reviewLines}

[댓글]
${commentLines}

[무드 태그 투표 비율] (이 작품에 평점을 매긴 사용자 중 해당 태그에 투표한 비율)
${moodTagLines}

[주의사항 태그 투표 비율]
${advisoryTagLines}

[사용자가 이 작품과 일치한다고 확인한 AI 검색어]
${confirmedQueryLines}

위 데이터만 근거로 아래 두 가지 글을 작성하세요. 데이터에 없는 내용은 절대 추측하거나 지어내지 마세요. 근거가 부족하면 "이 부분은 아직 사용자 데이터가 부족합니다"처럼 솔직하게 밝히세요.

1. community_opinion: 커뮤니티의 전반적인 반응과 분위기를 요약하는 글 (3~6문장, 정보 전달체, 존댓말 사용 안 함). 호평/혹평이 갈리는 지점이나 자주 언급되는 특징을 포함하세요.

2. content_advisory: 폭력성/고어, 선정성, 무서움/긴장감, 가족 시청 적합성, 스포일러성 반전 주의 등 시청 전 참고할 점을 다루는 글 (3~6문장). 주의사항 태그 투표 비율을 우선 근거로 삼고, 리뷰 텍스트는 보조 근거로만 사용하세요. 태그 투표가 없는 항목은 추측하지 말고 데이터가 부족하다고 명시하세요.

반드시 아래 JSON 형식으로만 답하세요:
{"community_opinion": "...", "content_advisory": "..."}`;
}

async function callSynthesisLlm(
  prompt: string
): Promise<{ communityOpinion: string; contentAdvisory: string }> {
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
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
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

  const parsed = JSON.parse(content) as {
    community_opinion?: string;
    content_advisory?: string;
  };

  if (!parsed.community_opinion || !parsed.content_advisory) {
    throw new Error("OpenAI synthesis response missing expected fields");
  }

  return {
    communityOpinion: parsed.community_opinion,
    contentAdvisory: parsed.content_advisory,
  };
}

async function replaceChunk(
  supabase: SupabaseClient,
  contentId: string,
  chunkType: "COMMUNITY_OPINION" | "CONTENT_ADVISORY",
  chunkText: string,
  sourceRecordId: string
): Promise<void> {
  const embedding = await createEmbedding(chunkText);

  await supabase
    .from("embedding_document")
    .delete()
    .eq("content_id", contentId)
    .eq("chunk_type", chunkType);

  const { error } = await supabase.from("embedding_document").insert({
    content_id: contentId,
    chunk_type: chunkType,
    chunk_text: chunkText,
    embedding,
    embedding_model: EMBEDDING_MODEL,
    embedding_version: "v1",
    source_id: SYNTHESIS_SOURCE,
    source_record_id: sourceRecordId,
  });
  if (error) throw error;
}

export type SynthesisResult =
  | { skipped: true; reason: string }
  | { skipped: false; chunksWritten: number };

/**
 * Synthesizes COMMUNITY_OPINION and CONTENT_ADVISORY embedding chunks for a
 * single piece of content from real user reviews, comments, tag votes, and
 * confirmed AI search queries. Skips (rather than fabricating a summary)
 * when there isn't enough sample data yet — see MIN_SAMPLE_SIZE.
 */
export async function synthesizeCommunityOpinion(contentId: string): Promise<SynthesisResult> {
  const supabase = getSupabaseAdminClient();

  const [{ reviewIds, reviews }, tagPercentages, confirmedQueries, title] = await Promise.all([
    fetchReviewTexts(supabase, contentId),
    fetchContentTagVotePercentages(supabase, contentId),
    fetchConfirmedSearchQueries(supabase, contentId),
    fetchContentTitle(supabase, contentId),
  ]);

  const [reviewComments, galleryComments] = await Promise.all([
    fetchReviewComments(supabase, reviewIds),
    fetchGalleryPostComments(supabase, contentId),
  ]);

  const comments = [...reviewComments, ...galleryComments];
  const sampleSize = reviews.length + comments.length;

  if (sampleSize < MIN_SAMPLE_SIZE) {
    return {
      skipped: true,
      reason: `not enough data: ${reviews.length} reviews + ${comments.length} comments = ${sampleSize} (minimum ${MIN_SAMPLE_SIZE})`,
    };
  }

  const moodTags = tagPercentages.filter((t) => t.category === "MOOD");
  const advisoryTags = tagPercentages.filter((t) => t.category === "CONTENT_ADVISORY");

  const prompt = buildSynthesisPrompt({
    title,
    reviews,
    comments,
    moodTags,
    advisoryTags,
    confirmedQueries,
  });

  const { communityOpinion, contentAdvisory } = await callSynthesisLlm(prompt);

  // Same timestamp for both chunks written in this run, so callers can tell
  // how fresh a given synthesis is (source_record_id, mirroring how
  // ingestMovie stamps WORK_SUMMARY with the TMDB id).
  const sourceRecordId = new Date().toISOString();

  await replaceChunk(supabase, contentId, "COMMUNITY_OPINION", communityOpinion, sourceRecordId);
  await replaceChunk(supabase, contentId, "CONTENT_ADVISORY", contentAdvisory, sourceRecordId);

  return { skipped: false, chunksWritten: 2 };
}
