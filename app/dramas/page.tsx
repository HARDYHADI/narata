import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import CategoryBar from "@/components/category-bar";
import AuthStatus from "@/components/auth-status";

// NOTE: no DRAMA content has been ingested yet (only TMDB movies so far),
// so this page renders the approved static sample design until a drama
// data source/ingestion pipeline exists.

const HERO_TILES = [
  { label: "K-DRAMA · 12부작", title: "서울의 마지막 편지" },
  { label: "J-DRAMA · 시즌 2", title: "비 오는 서점" },
  { label: "OTT ORIGINAL", title: "백야의 기록" },
  { label: "UK SERIES", title: "North Window" },
];

const NOW_AIRING = [
  { tone: "tone-1", tag: "DRAMA · 8/12화", title: "서울의\n마지막 편지", name: "서울의 마지막 편지", rating: "4.7", note: "댓글 급상승" },
  { tone: "tone-2", tag: "ROMANCE · 6/10화", title: "비 오는\n서점", name: "비 오는 서점", rating: "4.4", note: "금요일" },
  { tone: "tone-3", tag: "THRILLER · 시즌 1", title: "백야의\n기록", name: "백야의 기록", rating: "4.6", note: "OTT" },
  { tone: "tone-4", tag: "HISTORICAL · 24화", title: "장안의\n달", name: "장안의 달", rating: "4.3", note: "완결 임박" },
  { tone: "tone-1", tag: "UK · 시즌 3", title: "North\nWindow", name: "North Window", rating: "4.5", note: "수요일" },
];

const WEEKDAY_SCHEDULE = [
  { day: "월", episodes: ["검은 정원 9화", "흰 고래 4화"] },
  { day: "화", episodes: ["장안의 달 23화"] },
  { day: "수 · 오늘", episodes: ["서울의 마지막 편지 8화", "North Window 5화"], today: true },
  { day: "목", episodes: ["백야의 기록 6화"] },
  { day: "금", episodes: ["비 오는 서점 6화"] },
  { day: "토", episodes: ["붉은 왕관 12화"] },
  { day: "일", episodes: ["여름의 집 10화"] },
];

const RANKING = [
  { rank: 1, title: "서울의 마지막 편지", change: "▲ 8" },
  { rank: 2, title: "백야의 기록", change: "▲ 3" },
  { rank: 3, title: "장안의 달", change: "NEW" },
  { rank: 4, title: "비 오는 서점", change: "▼ 1" },
];

export default function DramasPage() {
  return (
    <>
      <SiteHeader
        active="content"
        searchPlaceholder="드라마 제목·배우·장면 검색"
        actions={
          <>
            <button className="btn orange">AI 찾기</button>
            <AuthStatus />
          </>
        }
      />
      <CategoryBar
        label="드라마"
        homeLabel="드라마 홈"
        tabs={["한국", "일본", "중국", "영미권", "OTT 오리지널", "방영 일정"]}
      />

      <div className="wrap">
        <div className="hero">
          <div>
            <span className="pill orange">오늘 밤 10시 공개</span>
            <h1>
              다음 화를 기다리는
              <br />
              사람들의 드라마
            </h1>
            <p>국가와 플랫폼을 넘어 방영 일정, 시즌, 원작 관계와 실시간 반응을 한 번에 확인하세요.</p>
            <div className="actions">
              <button className="btn orange">서울의 마지막 편지 보기</button>
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
              <h2>지금 방영 중인 드라마</h2>
              <div className="sub">방영 회차와 댓글 증가량을 함께 반영했어요</div>
            </div>
            <div className="tabs">
              <button className="tab on">전체</button>
              <button className="tab">한국</button>
              <button className="tab">일본</button>
              <button className="tab">중국</button>
              <button className="tab">영미권</button>
            </div>
          </div>
          <div className="posters">
            {NOW_AIRING.map((item) => (
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
              <h3>이번 주 방영 일정</h3>
              <div className="weekday">
                {WEEKDAY_SCHEDULE.map((d) => (
                  <div key={d.day} className={`day${d.today ? " today" : ""}`}>
                    <b>{d.day}</b>
                    {d.episodes.map((ep) => (
                      <span key={ep}>{ep}</span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <aside className="card panel rank">
              <h3>실시간 드라마 순위</h3>
              {RANKING.map((r) => (
                <div key={r.rank} className="listrow">
                  <b>{r.rank}</b>
                  <span>{r.title}</span>
                  <small>{r.change}</small>
                </div>
              ))}
            </aside>
          </div>
        </div>
      </div>

      <SiteFooter
        title="회차가 공개되는 순간, 이야기도 시작됩니다"
        subtitle="방영 일정 · 평점 · 원작 · 실시간 갤러리"
      />
    </>
  );
}
