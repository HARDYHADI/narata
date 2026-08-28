import Link from "next/link";
import SiteFooter from "@/components/site-footer";

const CONTENT_NAV = [
  { label: "영화", href: "/movies" },
  { label: "드라마", href: "/movies" },
  { label: "애니", href: "/movies" },
  { label: "만화", href: "/movies" },
  { label: "웹툰", href: "/movies" },
  { label: "웹소설", href: "/movies" },
];

const HERO_GENRES = [
  { type: "MOVIE", title: "검은 파도의 밤" },
  { type: "WEBTOON", title: "호랑이의 계절" },
  { type: "NOVEL", title: "회귀한 서기관" },
  { type: "ANIME", title: "별의 정원" },
];

const TRENDING = [
  { tone: "tone-1", tag: "MOVIE · 2026", title: "검은 파도의\n밤", name: "검은 파도의 밤", rating: "4.6", note: "토론 2.8천" },
  { tone: "tone-2", tag: "WEBTOON · 연재중", title: "호랑이의\n계절", name: "호랑이의 계절", rating: "4.8", note: "리뷰 9.1천" },
  { tone: "tone-3", tag: "DRAMA · 12부작", title: "서울의\n마지막 편지", name: "서울의 마지막 편지", rating: "4.4", note: "댓글 급상승" },
  { tone: "tone-4", tag: "ANIME · TV", title: "별의\n정원", name: "별의 정원", rating: "4.7", note: "찜 1.2만" },
  { tone: "tone-5", tag: "WEBNOVEL · 완결", title: "회귀한\n서기관", name: "회귀한 서기관", rating: "4.5", note: "리뷰 4.3천" },
];

const RECOMMENDATIONS = [
  { tone: "", match: "92% · 영화", title: "여름의 증언", note: "서정적 미스터리" },
  { tone: "tone-2", match: "89% · 애니", title: "푸른 우체국", note: "따뜻한 성장물" },
  { tone: "tone-3", match: "87% · 웹툰", title: "작은 궤도", note: "낮은 로맨스 비중" },
];

const RANKING = [
  { rank: 1, title: "호랑이의 계절", change: "▲ 12" },
  { rank: 2, title: "검은 파도의 밤", change: "▲ 7" },
  { rank: 3, title: "푸른 우체국", change: "NEW" },
  { rank: 4, title: "회귀한 서기관", change: "▲ 3" },
];

const HOT_POSTS = [
  { title: "[분석] 마지막 장면의 소나무가 뜻하는 것", comments: 128 },
  { title: "[감상] 스포 없이 말한다, 이번 화 미쳤다", comments: 94 },
  { title: "[질문] 이 설정 원작 몇 화에서 나왔음?", comments: 67 },
];

export default function Home() {
  return (
    <>
      <header className="header">
        <div className="wrap hrow">
          <Link href="/" className="logo">
            <b>N</b>ㅏ라타
          </Link>
          <nav className="nav">
            <Link href="/" className="on">
              홈
            </Link>
            {CONTENT_NAV.map((item) => (
              <Link key={item.label} href={item.href}>
                {item.label}
              </Link>
            ))}
            <Link href="/community">커뮤니티</Link>
          </nav>
          <div className="grow" />
          <div className="search">
            제목, 인물, 장면을 검색해보세요
            <i />
          </div>
          <Link href="/ai" className="btn orange">
            AI 찾기
          </Link>
          <button className="btn">로그인</button>
        </div>
      </header>

      <div className="wrap">
        <div className="hero">
          <div>
            <span className="pill orange">이번 주 이야기 1위</span>
            <h1>
              좋아하는 이야기를
              <br />
              발견하고, 함께 말해요
            </h1>
            <p>
              영화부터 웹소설까지 한곳에서 탐색하고 평가하세요.
              <br />
              기억나지 않는 작품은 AI가 단서부터 함께 찾아드립니다.
            </p>
            <div className="actions">
              <Link href="/movies" className="btn orange">
                지금 탐색하기
              </Link>
              <Link
                href="/community"
                className="btn ghost"
                style={{ color: "white", borderColor: "rgba(255,255,255,.35)" }}
              >
                인기 이야기 보기
              </Link>
            </div>
          </div>
          <div className="hero-grid">
            {HERO_GENRES.map((g) => (
              <div key={g.title} className="genre">
                <small>{g.type}</small>
                <strong>{g.title}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="section" style={{ borderTop: 0, paddingTop: 0 }}>
          <div className="headrow">
            <div>
              <h2>지금 가장 많이 보는 작품</h2>
              <div className="sub">모든 매체의 평점과 토론량을 함께 반영했어요</div>
            </div>
            <div className="tabs">
              <button className="tab on">전체</button>
              <button className="tab">영화</button>
              <button className="tab">드라마</button>
              <button className="tab">애니</button>
              <button className="tab">웹툰</button>
            </div>
          </div>
          <div className="posters">
            {TRENDING.map((item) => (
              <div key={item.name}>
                <div className={`poster ${item.tone}`}>
                  <small>{item.tag}</small>
                  <strong>
                    {item.title.split("\n").map((line, i) => (
                      <span key={i}>
                        {i > 0 && <br />}
                        {line}
                      </span>
                    ))}
                  </strong>
                </div>
                <div className="meta">
                  <b>{item.name}</b>
                  <span className="stars">★ {item.rating}</span> · {item.note}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <div className="home-lower">
            <div className="card recommend">
              <div className="headrow" style={{ margin: 0 }}>
                <div>
                  <h2 style={{ fontSize: 24 }}>지우님 취향에 맞는 작품</h2>
                  <div className="sub">잔잔한 미스터리 · 성장 서사를 좋아하네요</div>
                </div>
                <span className="pill orange">취향 일치 92%</span>
              </div>
              <div className="recs">
                {RECOMMENDATIONS.map((r) => (
                  <div key={r.title} className={`rec ${r.tone}`}>
                    <small>{r.match}</small>
                    <b>{r.title}</b>
                    <small>{r.note}</small>
                  </div>
                ))}
              </div>
            </div>
            <div className="card rank">
              <h2 style={{ fontSize: 24 }}>실시간 급상승</h2>
              {RANKING.map((r) => (
                <div key={r.rank} className="rankrow">
                  <b>{r.rank}</b>
                  <span>{r.title}</span>
                  <small>{r.change}</small>
                </div>
              ))}
            </div>
          </div>

          <div className="community-strip">
            <div className="card feed">
              <div className="headrow" style={{ margin: 0 }}>
                <h2 style={{ fontSize: 22 }}>실시간 인기글</h2>
                <span className="pill">댓글 빠른 순</span>
              </div>
              {HOT_POSTS.map((p) => (
                <div key={p.title} className="feedrow">
                  <span>{p.title}</span>
                  <b>{p.comments}</b>
                </div>
              ))}
            </div>
            <div className="card ai-banner">
              <div>
                <span className="pill dark">NARATA AI</span>
                <h2 style={{ margin: "12px 0 5px" }}>제목이 기억나지 않나요?</h2>
                <div className="sub">장면과 분위기만 말해도 후보를 찾아드려요.</div>
              </div>
              <div className="prompt">“어릴 때 본 영화인데 거울 속 세계가 나왔어…”</div>
            </div>
          </div>
        </div>
      </div>

      <SiteFooter
        title={
          <>
            <span style={{ color: "var(--orange)" }}>N</span>ㅏ라타
          </>
        }
        subtitle="좋아하는 이야기를 발견하고, 평가하고, 함께 이야기하다."
      />
    </>
  );
}
