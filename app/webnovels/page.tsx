import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import CategoryBar from "@/components/category-bar";
import AuthStatus from "@/components/auth-status";

// NOTE: no WEBNOVEL content has been ingested yet (only TMDB movies so
// far), so this page renders the approved static sample design until a
// web-novel data source/ingestion pipeline exists.

const HERO_TILES = [
  { label: "FANTASY · 284화", title: "회귀한 서기관" },
  { label: "ROMANCE · 완결", title: "겨울 공작의 편지" },
  { label: "MARTIAL ARTS", title: "청명검로" },
  { label: "MODERN · 126화", title: "야간 편집부" },
];

const TREND_CHIPS = [
  { label: "전체", on: true },
  { label: "회귀" },
  { label: "복수" },
  { label: "정치" },
  { label: "성장" },
  { label: "로맨스 적음" },
];

const TRENDING_NOVELS = [
  { tone: "tone-1", tag: "판타지 · 284화", title: "회귀한\n서기관", name: "회귀한 서기관", rating: "4.8", note: "매일 연재" },
  { tone: "tone-2", tag: "로맨스 · 완결", title: "겨울 공작의\n편지", name: "겨울 공작의 편지", rating: "4.7", note: "192화" },
  { tone: "tone-3", tag: "무협 · 418화", title: "청명\n검로", name: "청명검로", rating: "4.6", note: "월~금" },
  { tone: "tone-4", tag: "현대물 · 126화", title: "야간\n편집부", name: "야간 편집부", rating: "4.5", note: "웹툰화" },
  { tone: "tone-1", tag: "SF · 203화", title: "작은\n궤도", name: "작은 궤도", rating: "4.6", note: "완결 임박" },
];

const TASTE_TAGS = [
  { label: "두뇌 싸움", on: true },
  { label: "영지 경영" },
  { label: "가족 후회" },
  { label: "아카데미" },
  { label: "헌터" },
  { label: "정치극" },
  { label: "성장형 주인공" },
  { label: "착각계" },
  { label: "피폐물" },
  { label: "힐링" },
];

const TASTE_RECOMMENDATIONS = [
  { title: "정치 비중 높고 로맨스 적은 회귀물", note: "18작품" },
  { title: "100화 안에 1부가 끝나는 판타지", note: "24작품" },
  { title: "가볍지만 설정이 탄탄한 현대물", note: "31작품" },
];

const MEDIA_MIX_UPCOMING = [
  { tag: "웹툰", title: "회귀한 서기관", note: "9월" },
  { tag: "드라마", title: "겨울 공작의 편지", note: "제작 확정" },
  { tag: "애니", title: "청명검로", note: "2027" },
  { tag: "영화", title: "작은 궤도", note: "각본 중" },
];

const COMMUNITY_POSTS = [
  { title: "[추천] 정치물 좋아하면 이 세 작품부터", count: 84 },
  { title: "[감상] 회귀한 서기관 오늘자 미쳤음", count: 73 },
  { title: "[질문] 이 설정 나오는 작품 제목 뭐였지?", count: 51 },
];

const AI_PROMPTS = [
  { prompt: "여주가 회귀하고 가족에게 복수하는 작품", action: "찾기" },
  { prompt: "로맨스 없고 영지 경영 비중 높은 판타지", action: "추천" },
  { prompt: "웹툰화된 완결 웹소설만 보여줘", action: "탐색" },
];

export default function WebnovelsPage() {
  return (
    <>
      <SiteHeader
        active="content"
        searchPlaceholder="작품·작가·키워드 검색"
        actions={
          <>
            <button className="btn orange">AI 찾기</button>
            <AuthStatus />
          </>
        }
      />
      <CategoryBar
        label="웹소설"
        homeLabel="웹소설 홈"
        tabs={["판타지", "로맨스", "무협", "현대물", "완결", "미디어믹스"]}
      />

      <div className="wrap">
        <div className="hero">
          <div>
            <span className="pill orange">오늘 10화 무료</span>
            <h1>
              수백 화 속에서
              <br />
              내 취향의 서사를 찾다
            </h1>
            <p>장르와 서사 태그, 연재 회차와 완결 여부, 웹툰·드라마 각색 정보까지 함께 탐색하세요.</p>
            <div className="actions">
              <button className="btn orange">취향으로 웹소설 찾기</button>
            </div>
          </div>
          <div className="hero-grid">
            {HERO_TILES.map((tile) => (
              <div key={tile.title} className="genre">
                <small>{tile.label}</small>
                <b>{tile.title}</b>
              </div>
            ))}
          </div>
        </div>

        <div className="section" style={{ borderTop: 0, paddingTop: 0 }}>
          <div className="headrow">
            <div>
              <h2>지금 독자들이 빠진 작품</h2>
              <div className="sub">최근 열람 지속률과 평가, 커뮤니티 반응을 함께 반영했어요</div>
            </div>
            <div className="chips">
              {TREND_CHIPS.map((c) => (
                <span key={c.label} className={`chip${c.on ? " on" : ""}`}>
                  {c.label}
                </span>
              ))}
            </div>
          </div>
          <div className="posters">
            {TRENDING_NOVELS.map((item) => (
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
          <div className="detail-grid">
            <div className="card panel">
              <h3>취향 태그로 빠르게 찾기</h3>
              <div className="chips">
                {TASTE_TAGS.map((t) => (
                  <span key={t.label} className={`chip${t.on ? " on" : ""}`}>
                    {t.label}
                  </span>
                ))}
              </div>
              {TASTE_RECOMMENDATIONS.map((r) => (
                <div key={r.title} className="listrow">
                  <b>추천</b>
                  <span>{r.title}</span>
                  <small>{r.note}</small>
                </div>
              ))}
            </div>
            <aside className="card panel">
              <h3>미디어믹스 예정</h3>
              {MEDIA_MIX_UPCOMING.map((m) => (
                <div key={m.title} className="listrow">
                  <b>{m.tag}</b>
                  <span>{m.title}</span>
                  <small>{m.note}</small>
                </div>
              ))}
            </aside>
          </div>
        </div>

        <div className="section">
          <div className="community-strip">
            <div className="card feed">
              <h3>웹소설 실시간 인기글</h3>
              {COMMUNITY_POSTS.map((p) => (
                <div key={p.title} className="feedrow">
                  <span>{p.title}</span>
                  <b>{p.count}</b>
                </div>
              ))}
            </div>
            <div className="card feed">
              <h3>AI로 작품 찾기</h3>
              {AI_PROMPTS.map((p) => (
                <div key={p.prompt} className="feedrow">
                  <span>&ldquo;{p.prompt}&rdquo;</span>
                  <b>{p.action}</b>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <SiteFooter
        title="회차가 많아도 취향의 단서는 선명하게"
        subtitle="장르 · 서사 태그 · 연재 상태 · 미디어믹스"
      />
    </>
  );
}
