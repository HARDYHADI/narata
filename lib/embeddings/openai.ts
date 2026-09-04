export const EMBEDDING_MODEL = "text-embedding-3-small";

export async function createEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`OpenAI embedding request failed: ${res.status}`);
  }

  const data = (await res.json()) as { data: { embedding: number[] }[] };
  return data.data[0].embedding;
}
