import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import CategoryBar from "@/components/category-bar";

// NOTE: no ANIME content has been ingested yet (only TMDB movies so far),
// so this page renders the approved static sample design until an anime
// data source/ingestion pipeline exists.

const HERO_TILES = [
  { label: "TV · 12화", title: "별의 정원" },
  { label: "ONA · 8화", title: "푸른 우체국" },
  { label: "MOVIE", title: "빛의 궤도" },
  { label: "SEQUEL", title: "마도서점 2기" },
];

const SEASON_TITLES = [
  { tone: "tone-1", tag: "TV · 월요일", title: "별의\n정원", name: "별의 정원", rating: "4.8", note: "7/12화" },
  { tone: "tone-2", tag: "ONA · 금요일", title: "푸른\n우체국", name: "푸른 우체국", rating: "4.6", note: "5/8화" },
  { tone: "tone-3", tag: "TV · 목요일", title: "마도서점\n2기", name: "마도서점 2기", rating: "4.5", note: "원작 있음" },
  { tone: "tone-4", tag: "MOVIE · 개봉 중", title: "빛의\n궤도", name: "빛의 궤도", rating: "4.7", note: "극장판" },
  { tone: "tone-1", tag: "TV · 토요일", title: "강철의\n여름", name: "강철의 여름", rating: "4.3", note: "8/13화" },
];

const TODAY_EPISODES = [
  { time: "18:00 · TV", title: "별의 정원 7화", note: "스튜디오 토리" },
  { time: "20:30 · ONA", title: "푸른 우체국 5화", note: "NARATA 평점 4.6" },
  { time: "22:00 · TV", title: "유리의 성 9화", note: "원작 만화 6권" },
  { time: "23:30 · TV", title: "붉은 행성 4화", note: "댓글 1.8천" },
  { time: "24:00 · TV", title: "야간열차 8화", note: "스포일러 보호" },
];

const STUDIOS = [
  { rank: 1, name: "Studio TORI", note: "작품 28" },
  { rank: 2, name: "Blue Frame", note: "작품 17" },
  { rank: 3, name: "Paper Moon", note: "작품 21" },
  { rank: 4, name: "North Animation", note: "작품 14" },
];

export default function AnimePage() {
  return (
    <>
      <SiteHeader
        active="content"
        searchPlaceholder="애니·성우·제작사 검색"
        actions={
          <>
            <button className="btn orange">AI 찾기</button>
            <button className="btn">로그인</button>
          </>
        }
      />
      <CategoryBar
        label="애니"
        homeLabel="애니 홈"
        tabs={["2026 여름", "TV", "극장판", "OVA·ONA", "완결작", "방영표"]}
      />

      <div className="wrap">
        <div className="hero">
          <div>
            <span className="pill orange">2026 SUMMER SEASON</span>
            <h1>
              이번 분기 애니를
              <br />
              놓치지 않는 방법
            </h1>
            <p>분기 신작부터 극장판, 원작 만화와 제작사 정보까지 연결해서 탐색하세요.</p>
            <div className="actions">
              <button className="btn orange">여름 분기 전체 보기</button>
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
              <h2>2026 여름 분기 화제작</h2>
              <div className="sub">방영 평가와 원작 독자 반응을 함께 보여드려요</div>
            </div>
            <div className="tabs">
              <button className="tab on">전체</button>
              <button className="tab">신작</button>
              <button className="tab">후속작</button>
              <button className="tab">극장판</button>
            </div>
          </div>
          <div className="posters">
            {SEASON_TITLES.map((item) => (
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
              <h3>오늘 공개되는 에피소드</h3>
              <div className="schedule">
                {TODAY_EPISODES.map((ep) => (
                  <div key={ep.title} className="episode">
                    <span>{ep.time}</span>
                    <b>{ep.title}</b>
                    <span>{ep.note}</span>
                  </div>
                ))}
              </div>
            </div>
            <aside className="card panel">
              <h3>인기 제작사</h3>
              {STUDIOS.map((s) => (
                <div key={s.rank} className="listrow">
                  <b>{s.rank}</b>
                  <span>{s.name}</span>
                  <small>{s.note}</small>
                </div>
              ))}
            </aside>
          </div>
        </div>
      </div>

      <SiteFooter
        title="분기 신작에서 원작까지 한 번에"
        subtitle="방영표 · 제작사 · 성우 · 원작 관계"
      />
    </>
  );
}
