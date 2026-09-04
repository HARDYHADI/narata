const CHAT_MODEL = "gpt-4o-mini";

export interface RerankCandidate {
  id: string;
  title: string;
  genres: string[];
  synopsis: string | null;
  director: string | null;
  castNames: string[] | null;
  releaseYear: string | null;
}

export interface RerankedResult {
  id: string;
  confidence: number;
  reason: string;
}

function buildPrompt(query: string, candidates: RerankCandidate[]): string {
  const candidateList = candidates
    .map((c, i) => {
      const lines = [
        `${i + 1}. id=${c.id}`,
        `제목: ${c.title}${c.releaseYear ? ` (${c.releaseYear})` : ""}`,
        `장르: ${c.genres.length > 0 ? c.genres.join(", ") : "정보 없음"}`,
        `감독: ${c.director ?? "정보 없음"}`,
        `출연: ${c.castNames && c.castNames.length > 0 ? c.castNames.join(", ") : "정보 없음"}`,
        `줄거리: ${c.synopsis ?? "정보 없음"}`,
      ];
      return lines.join("\n");
    })
    .join("\n\n");

  return `사용자가 다음과 같은 단서로 작품을 찾고 있습니다: "${query}"

아래는 벡터 유사도로 1차로 골라낸 후보 영화 목록입니다:

${candidateList}

각 후보가 사용자의 단서와 실제로 일치하는지 냉정하게 판단하세요. 장르나 줄거리가 겹치더라도 핵심 단서(등장인물, 사건, 감독 등)와 명백히 안 맞으면 제외하세요. 근거 없이 확신도를 부풀리지 마세요.

반드시 아래 JSON 형식으로만 답하세요. 관련 있는 후보만 confidence 높은 순으로 포함하세요:
{"results": [{"id": "후보 id", "confidence": 0부터 100 사이 정수, "reason": "일치하거나 부분적으로 일치하는 구체적인 이유 한 문장"}]}

일치하는 후보가 하나도 없으면 {"results": []}로 답하세요.`;
}

export async function rerankCandidates(
  query: string,
  candidates: RerankCandidate[]
): Promise<RerankedResult[]> {
  if (candidates.length === 0) return [];

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
      messages: [{ role: "user", content: buildPrompt(query, candidates) }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
    signal: AbortSignal.timeout(20_000),
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

  const parsed = JSON.parse(content) as { results?: RerankedResult[] };
  const validIds = new Set(candidates.map((c) => c.id));

  return (parsed.results ?? []).filter(
    (r) => validIds.has(r.id) && typeof r.confidence === "number"
  );
}
