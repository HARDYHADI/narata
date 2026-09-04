// Grounded extraction only: this prompt is instructed to extract ONLY
// relations explicitly stated in the given Wikipedia excerpt, quoting its
// evidence for each one — never to assert a relation from the model's own
// memory/judgment (see the core principle in the AGENTS task notes). Reuses
// the exact OpenAI calling convention from lib/ai/rerank.ts.

const CHAT_MODEL = "gpt-4o-mini";

const VALID_RELATION_TYPES = [
  "ORIGINAL",
  "ADAPTATION",
  "SEQUEL",
  "PREQUEL",
  "SPINOFF",
  "REMAKE",
  "SAME_UNIVERSE",
] as const;

export type RelationType = (typeof VALID_RELATION_TYPES)[number];

export interface ExtractedRelation {
  relatedTitle: string;
  relationType: RelationType;
  evidenceQuote: string;
}

function buildPrompt(title: string, extractText: string): string {
  return `아래는 위키백과에서 가져온 '${title}'에 대한 발췌문이다.

${extractText}

이 텍스트 안에 명시적으로 언급된 다른 작품과의 관계만 찾아라 (원작/각색/속편/프리퀄/스핀오프/리메이크/같은 세계관). 텍스트에 없는 내용은 절대 추론하지 마라. 각 관계마다 어느 문장에서 근거를 찾았는지 그대로 인용해라.

반드시 아래 JSON 형식으로만 답하세요:
{"relations": [{"relatedTitle": "관련 작품의 정확한 제목", "relationType": "ORIGINAL, ADAPTATION, SEQUEL, PREQUEL, SPINOFF, REMAKE, SAME_UNIVERSE 중 하나", "evidenceQuote": "위 발췌문에서 그대로 가져온 근거 문장"}]}

텍스트에 명시적으로 언급된 관계가 하나도 없으면 반드시 {"relations": []}로 답하세요.`;
}

function isValidRelation(value: unknown): value is ExtractedRelation {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.relatedTitle === "string" &&
    r.relatedTitle.trim().length > 0 &&
    typeof r.relationType === "string" &&
    (VALID_RELATION_TYPES as readonly string[]).includes(r.relationType) &&
    typeof r.evidenceQuote === "string" &&
    r.evidenceQuote.trim().length > 0
  );
}

export async function extractRelationsFromText(
  title: string,
  extractText: string
): Promise<ExtractedRelation[]> {
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
      messages: [{ role: "user", content: buildPrompt(title, extractText) }],
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

  const parsed = JSON.parse(content) as { relations?: unknown };
  if (!Array.isArray(parsed.relations)) return [];

  return parsed.relations.filter(isValidRelation);
}
