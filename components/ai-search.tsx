"use client";

import { useState } from "react";
import Link from "next/link";
import type { MovieListItem } from "@/lib/movies/queries";

interface SearchResult extends MovieListItem {
  similarity: number;
  matchedText: string;
}

const THUMB_TONES = ["", "tone-2", "tone-3"];

const EXAMPLES = [
  { title: "장면으로 찾기", prompt: "기차 안에서 시간이 거꾸로 흐르는 영화였어" },
  { title: "취향 추천", prompt: "우울하지 않고 12화 안에 끝나는 성장 애니" },
  { title: "관계 묻기", prompt: "이 드라마 원작 웹툰과 결말이 달라?" },
];

export default function AiSearch() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function runSearch(text: string) {
    const trimmed = text.trim();
    if (!trimmed || status === "loading") return;

    setQuery(trimmed);
    setSubmittedQuery(trimmed);
    setStatus("loading");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error ?? "검색에 실패했어요.");
        setStatus("error");
        return;
      }

      setResults(data.results ?? []);
      setStatus("done");
    } catch {
      setErrorMessage("검색에 실패했어요. 잠시 후 다시 시도해주세요.");
      setStatus("error");
    }
  }

  return (
    <>
      <div className="ai-card">
        <div className="chat">
          {submittedQuery && <div className="bubble user">{submittedQuery}</div>}

          {status === "loading" && (
            <div className="bubble ai">단서를 바탕으로 후보를 찾고 있어요...</div>
          )}

          {status === "error" && errorMessage && <div className="bubble ai">{errorMessage}</div>}

          {status === "done" && (
            <>
              <div className="bubble ai">
                {results.length > 0
                  ? `가장 가까운 ${results.length}개 작품을 찾았어요.`
                  : "일치하는 작품을 찾지 못했어요. 다른 단서로 다시 설명해보시겠어요?"}
              </div>
              {results.length > 0 && (
                <div className="results">
                  {results.map((movie, i) => (
                    <article key={movie.id} className="result">
                      <div
                        className={`thumb ${THUMB_TONES[i % THUMB_TONES.length]}`}
                        style={{ padding: 0, overflow: "hidden" }}
                      >
                        {movie.poster_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={movie.poster_url}
                            alt={movie.canonical_title}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        ) : (
                          <div style={{ padding: 15 }}>
                            <small>{movie.release_date?.slice(0, 4) ?? "MOVIE"}</small>
                            <br />
                            <b>{movie.canonical_title}</b>
                          </div>
                        )}
                      </div>
                      <div className="confidence">
                        일치 가능성 {Math.min(100, Math.max(0, Math.round(movie.similarity * 100)))}%
                      </div>
                      <h3>
                        <Link href={`/movies/${movie.id}`}>{movie.canonical_title}</Link>
                      </h3>
                      <div className="reason">{movie.matchedText}</div>
                      <div className="feedback">
                        <button type="button">이 작품 맞아요</button>
                        <button type="button">아니에요</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(query);
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="기억나는 장면이나 분위기를 설명해주세요"
          />
          <button type="submit" className="btn orange" disabled={status === "loading"}>
            보내기
          </button>
        </form>
        <div className="sub" style={{ marginTop: 12 }}>
          답변은 저장된 작품 정보(제목·장르·줄거리)와의 유사도로 찾은 후보이며, 확신도가 낮을 수
          있어요.
        </div>
      </div>

      <div className="examples">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.title}
            type="button"
            className="example"
            style={{ textAlign: "left", cursor: "pointer" }}
            onClick={() => runSearch(ex.prompt)}
          >
            <b>{ex.title}</b>
            <br />“{ex.prompt}”
          </button>
        ))}
      </div>
    </>
  );
}
