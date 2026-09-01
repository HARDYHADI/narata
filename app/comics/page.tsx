import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import CategoryBar from "@/components/category-bar";
import AuthStatus from "@/components/auth-status";

// NOTE: no COMIC content has been ingested yet (only TMDB movies so far),
// so this page renders the approved static sample design until a comics
// data source/ingestion pipeline exists.

const HERO_TILES = [
  { label: "NEW VOLUME · 8권", title: "작은 궤도" },
  { label: "COMPLETE · 12권", title: "여섯 번째 등대" },
  { label: "SERIALIZING", title: "검은 숲의 아이" },
  { label: "ANIME ADAPTATION", title: "별의 정원" },
];

const NEW_VOLUMES = [
  { date: "8월 3일 · 8권", title: "작은 궤도", author: "윤해수" },
  { date: "8월 7일 · 12권", title: "여섯 번째 등대", author: "김로아" },
  { date: "8월 11일 · 4권", title: "검은 숲의 아이", author: "사토 린" },
  { date: "8월 18일 · 6권", title: "별의 정원", author: "아오이 켄" },
  { date: "8월 22일 · 3권", title: "낮의 경계", author: "M. Rowe" },
  { date: "8월 29일 · 완결", title: "바람의 지도", author: "한서우" },
];

const SERIALIZING = [
  { rank: 1, name: "작은 궤도 · 월간 은하", rating: "4.8" },
  { rank: 2, name: "검은 숲의 아이 · 주간 틴", rating: "4.7" },
  { rank: 3, name: "장안의 밤 · 코믹스 R", rating: "4.5" },
  { rank: 4, name: "붉은 유리 · 오후 만화", rating: "4.4" },
  { rank: 5, name: "방과 후 항해 · BOY", rating: "4.3" },
];

const MEDIA_MIX = [
  { tag: "애니", title: "별의 정원 2기 확정", time: "오늘" },
  { tag: "영화", title: "여섯 번째 등대 캐스팅", time: "어제" },
  { tag: "드라마", title: "작은 궤도 제작 발표", time: "3일 전" },
];

export default function ComicsPage() {
  return (
    <>
      <SiteHeader
        active="content"
        searchPlaceholder="작품·작가·출판사 검색"
        actions={
          <>
            <button className="btn orange">AI 찾기</button>
            <AuthStatus />
          </>
        }
      />
      <CategoryBar
        label="만화"
        homeLabel="만화 홈"
        tabs={["신간", "연재 중", "완결", "출판사", "작가", "미디어믹스"]}
      />

      <div className="wrap">
        <div className="hero">
          <div>
            <span className="pill orange">8월 신간 184권</span>
            <h1>
              한 권에서 시작되는
              <br />
              더 넓은 세계관
            </h1>
            <p>단행본 발매 정보와 연재 상태, 작가, 출판사, 애니·드라마 각색 관계를 함께 확인하세요.</p>
            <div className="actions">
              <button className="btn orange">이번 달 신간 보기</button>
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
              <h2>이번 달 주목할 신간</h2>
              <div className="sub">발매일과 이전 권 평가를 함께 확인하세요</div>
            </div>
            <div className="tabs">
              <button className="tab on">전체</button>
              <button className="tab">국내</button>
              <button className="tab">일본</button>
              <button className="tab">그래픽노블</button>
            </div>
          </div>
          <div className="shelf">
            {NEW_VOLUMES.map((v) => (
              <div key={v.title} className="book">
                <small>{v.date}</small>
                <b>{v.title}</b>
                <small>{v.author}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <div className="detail-grid">
            <div className="card panel">
              <h3>연재 중 인기 작품</h3>
              {SERIALIZING.map((s) => (
                <div key={s.rank} className="listrow">
                  <b>{s.rank}</b>
                  <span>{s.name}</span>
                  <small className="stars">★ {s.rating}</small>
                </div>
              ))}
            </div>
            <aside className="card panel">
              <h3>미디어믹스 소식</h3>
              {MEDIA_MIX.map((m) => (
                <div key={m.title} className="listrow">
                  <b>{m.tag}</b>
                  <span>{m.title}</span>
                  <small>{m.time}</small>
                </div>
              ))}
            </aside>
          </div>
        </div>
      </div>

      <SiteFooter
        title="권수와 연재지, 각색작까지 연결해서"
        subtitle="신간 · 연재 · 출판사 · 미디어믹스"
      />
    </>
  );
}
