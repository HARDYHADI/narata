import Link from "next/link";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import CategoryBar from "@/components/category-bar";
import AuthStatus from "@/components/auth-status";

// NOTE: no WEBTOON content has been ingested yet (only TMDB movies so far),
// so this page renders the approved static sample design until a webtoon
// data source/ingestion pipeline exists.

const HERO_TILES = [
  { label: "THU · 92화", title: "호랑이의 계절" },
  { label: "WED · 48화", title: "작은 궤도" },
  { label: "SUN · 71화", title: "회귀한 서기관" },
  { label: "COMPLETE", title: "여섯 번째 등대" },
];

const TODAY_UPDATES = [
  { tone: "tone-1", tag: "목요일 · 92화", title: "호랑이의\n계절", name: "호랑이의 계절", rating: "4.9", note: "댓글 2.1천" },
  { tone: "tone-2", tag: "목요일 · 48화", title: "작은\n궤도", name: "작은 궤도", rating: "4.7", note: "22:00" },
  { tone: "tone-3", tag: "목요일 · 71화", title: "회귀한\n서기관", name: "회귀한 서기관", rating: "4.6", note: "원작 있음" },
  { tone: "tone-4", tag: "목요일 · 16화", title: "밤의\n식물원", name: "밤의 식물원", rating: "4.5", note: "신작" },
  { tone: "tone-1", tag: "목요일 · 103화", title: "검은\n우체국", name: "검은 우체국", rating: "4.4", note: "시즌 3" },
];

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

const PLATFORMS = ["네이버웹툰", "카카오페이지", "리디", "레진코믹스", "봄툰"];

const PLATFORM_RANKING = [
  { rank: 1, name: "호랑이의 계절 · 네이버웹툰", change: "▲ 12" },
  { rank: 2, name: "회귀한 서기관 · 카카오페이지", change: "▲ 5" },
  { rank: 3, name: "작은 궤도 · 리디", change: "NEW" },
  { rank: 4, name: "밤의 식물원 · 레진코믹스", change: "▲ 2" },
];

const STATUS_ALERTS = [
  { tag: "복귀", title: "새벽의 기록", note: "9/4" },
  { tag: "휴재", title: "붉은 도서관", note: "2주" },
  { tag: "완결", title: "여섯 번째 등대", note: "오늘" },
  { tag: "신작", title: "밤의 식물원", note: "16화" },
];

export default function WebtoonsPage() {
  return (
    <>
      <SiteHeader
        active="content"
        searchPlaceholder="웹툰·작가·플랫폼 검색"
        actions={
          <>
            <Link href="/ai" className="btn orange">AI 찾기</Link>
            <AuthStatus />
          </>
        }
      />
      <CategoryBar
        label="웹툰"
        homeLabel="웹툰 홈"
        tabs={["요일별", "신작", "완결", "휴재", "플랫폼", "원작 웹소설"]}
      />

      <div className="wrap">
        <div className="hero">
          <div>
            <span className="pill orange">목요일 댓글 1위</span>
            <h1>
              기다리던 요일에
              <br />
              새로운 화가 도착했습니다
            </h1>
            <p>플랫폼을 넘나들며 오늘 공개된 작품, 휴재 일정과 원작 웹소설 관계까지 확인하세요.</p>
            <div className="actions">
              <button className="btn orange">오늘의 웹툰 보기</button>
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
              <h2>오늘 업데이트된 웹툰</h2>
              <div className="sub">업로드 시간과 스포일러 없는 초기 반응을 보여드려요</div>
            </div>
            <div className="tabs">
              {WEEKDAYS.map((day) => (
                <button key={day} className={`tab${day === "목" ? " on" : ""}`}>
                  {day}
                </button>
              ))}
            </div>
          </div>
          <div className="posters">
            {TODAY_UPDATES.map((item) => (
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
              <h3>플랫폼별 인기 작품</h3>
              <div className="platforms">
                {PLATFORMS.map((p) => (
                  <span key={p} className="platform">
                    {p}
                  </span>
                ))}
              </div>
              {PLATFORM_RANKING.map((r) => (
                <div key={r.rank} className="listrow">
                  <b>{r.rank}</b>
                  <span>{r.name}</span>
                  <small>{r.change}</small>
                </div>
              ))}
            </div>
            <aside className="card panel">
              <h3>연재 상태 알림</h3>
              {STATUS_ALERTS.map((a) => (
                <div key={a.title} className="listrow">
                  <b>{a.tag}</b>
                  <span>{a.title}</span>
                  <small>{a.note}</small>
                </div>
              ))}
            </aside>
          </div>
        </div>
      </div>

      <SiteFooter
        title="플랫폼은 달라도 취향과 이야기는 하나로"
        subtitle="요일 연재 · 휴재 · 완결 · 원작 관계"
      />
    </>
  );
}
