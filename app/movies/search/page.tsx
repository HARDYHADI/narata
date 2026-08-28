import SiteHeader from "@/components/site-header";
import MovieBar from "@/components/movie-bar";

const RESULTS = [
  {
    tone: "tone-1",
    tag: "영화 · 2026",
    title: "검은 파도의 밤",
    highlight: "파도",
    summary: "십 년 만에 고향 섬으로 돌아온 기록원이 사라진 아버지의 녹음테이프를 발견한다.",
    people: "감독 박해원 · 윤서진, 김도현",
    rating: "4.6",
    count: "12,842명",
  },
  {
    tone: "tone-3",
    tag: "영화 · 2021",
    title: "파도가 멈춘 날",
    highlight: "파도",
    summary: "해안 도시의 시간이 멈춘 뒤 홀로 움직일 수 있게 된 소년의 이야기.",
    people: "감독 로빈 헤일 · 영국",
    rating: "4.1",
    count: "4,211명",
  },
  {
    tone: "tone-2",
    tag: "영화 · 2018",
    title: "푸른 파도",
    highlight: "파도",
    summary: "서핑 선수를 꿈꾸는 두 자매가 서로 다른 방식으로 고향을 떠날 준비를 한다.",
    people: "감독 이지현 · 한국",
    rating: "3.9",
    count: "1,829명",
  },
  {
    tone: "tone-4",
    tag: "영화 · 2014",
    title: "파도 아래",
    highlight: "파도",
    summary: "심해 탐사 중 실종된 동료가 보낸 신호를 추적하는 SF 스릴러.",
    people: "감독 마야 첸 · 미국",
    rating: "4.0",
    count: "8,304명",
  },
];

const RELATED = ["바다 영화", "섬 미스터리", "재난 영화", "박해원 감독"];

function highlightTitle(title: string, term: string) {
  const idx = title.indexOf(term);
  if (idx === -1) return title;
  return (
    <>
      {title.slice(0, idx)}
      <mark style={{ background: "#ffd89a" }}>{term}</mark>
      {title.slice(idx + term.length)}
    </>
  );
}

export default function MovieSearchPage() {
  return (
    <>
      <SiteHeader active="content" actions={<button className="btn">로그인</button>} />
      <MovieBar active="browse" />

      <div className="wrap">
        <div className="search-hero">
          <span className="eyebrow">MOVIE SEARCH</span>
          <h1 style={{ fontSize: 39, margin: "7px 0 20px" }}>영화 검색</h1>
          <div className="big-search">
            <span>파도</span>
            <b>⌕</b>
          </div>
          <div className="suggests">
            <span className="pill on">영화 14</span>
            <span className="pill">인물 3</span>
            <span className="pill">컬렉션 8</span>
            <span className="pill">게시글 126</span>
          </div>
        </div>

        <div className="search-layout">
          <div className="card">
            <div style={{ padding: 21 }}>
              <b>‘파도’와 관련된 영화 14편</b>
            </div>
            {RESULTS.map((r) => (
              <div key={r.title} className="search-item">
                <div className={`sm-cover ${r.tone}`}>{r.title}</div>
                <div>
                  <span className="pill">{r.tag}</span>
                  <h3>{highlightTitle(r.title, r.highlight)}</h3>
                  <p>{r.summary}</p>
                  <span className="sub">{r.people}</span>
                </div>
                <div className="score">
                  <strong className="stars">★ {r.rating}</strong>
                  <div className="sub">{r.count}</div>
                </div>
              </div>
            ))}
          </div>

          <aside className="side">
            <div className="card ai-box">
              <span className="pill orange">NARATA AI</span>
              <h2 style={{ fontSize: 23, margin: "12px 0 5px" }}>찾는 영화가 안 보이나요?</h2>
              <p>제목이 아니라 기억나는 장면과 분위기로도 찾을 수 있어요.</p>
              <div className="prompt">“밤바다에서 라디오 신호를 듣는 영화였어…”</div>
              <button className="btn orange" style={{ width: "100%" }}>
                AI로 영화 찾기
              </button>
            </div>
            <div className="card sidebox">
              <h3>연관 검색어</h3>
              <div className="gallery">
                {RELATED.map((tag) => (
                  <span key={tag} className="pill">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
