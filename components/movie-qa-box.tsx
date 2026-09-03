"use client";

import { useState } from "react";

const EXAMPLE_QUESTION = "마지막 장면 해석을 스포일러 표시해서 알려줘";

export default function MovieQaBox({ contentId }: { contentId: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAsk() {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setAnswer(null);

    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_id: contentId, question: trimmed }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.answer) {
        setError(typeof data?.error === "string" ? data.error : "답변을 가져오지 못했어요. 잠시 후 다시 시도해주세요.");
        return;
      }

      setAnswer(data.answer as string);
    } catch {
      setError("답변을 가져오지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="qbox">
      <span className="pill orange">AI에게 질문</span>
      <b>이 작품에 대해 궁금한 점이 있나요?</b>
      <div className="prompt">
        {answer ? (
          <span>{answer}</span>
        ) : (
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAsk();
            }}
            placeholder={`"${EXAMPLE_QUESTION}"`}
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              background: "transparent",
              font: "inherit",
              color: "inherit",
            }}
          />
        )}
        {error && (
          <div style={{ color: "#c0392b", fontSize: 12, marginTop: 6 }}>{error}</div>
        )}
      </div>
      <button
        type="button"
        className="btn orange"
        onClick={answer ? () => { setAnswer(null); setQuestion(""); } : handleAsk}
        disabled={loading || (!answer && !question.trim())}
      >
        {loading ? "생각 중..." : answer ? "다시 질문하기" : "질문하기"}
      </button>
    </div>
  );
}
