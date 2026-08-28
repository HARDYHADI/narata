import Link from "next/link";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import MovieBar from "@/components/movie-bar";

const NOW_SHOWING = [
  { tone: "tone-1", tag: "MYSTERY · 15", title: "검은 파도의\n밤", name: "검은 파도의 밤", rating: "4.6", note: "예매 1위" },
  { tone: "tone-2", tag: "DRAMA · 12", title: "여름의\n증언", name: "여름의 증언", rating: "4.4", note: "리뷰 3.1천" },
  { tone: "tone-3", tag: "THRILLER · 18", title: "낯선\n신호", name: "낯선 신호", rating: "4.2", note: "토론 급상승" },
  { tone: "tone-4", tag: "ANIMATION · ALL", title: "별의\n정원", name: "별의 정원", rating: "4.7", note: "가족 영화" },
  { tone: "tone-1", tag: "DOCUMENTARY · ALL", title: "숲이 기억하는\n것", name: "숲이 기억하는 것", rating: "4.5", note: "독립영화" },
];

const NEWS = [
  { tag: "개봉 예정", title: "9월 기대작 12편, 공개 일정 한눈에 보기", time: "2시간 전" },
  { tag: "기획전", title: "비 오는 날 보기 좋은 미스터리 영화", time: "오늘" },
  { tag: "컬렉션", title: "원작 웹소설보다 결말이 좋은 영화 8편", time: "어제" },
];

const RANKING = [
  { rank: 1, title: "검은 파도의 밤", change: "▲ 4" },
  { rank: 2, title: "별의 정원", change: "NEW" },
  { rank: 3, title: "여름의 증언", change: "▲ 1" },
  { rank: 4, title: "낯선 신호", change: "▼ 2" },
];

export default function MovieHomePage() {
  return (
    <>
      <SiteHeader
        active="content"
        searchPlaceholder="영화 제목·감독·배우 검색"
        actions={
          <>
            <Link href="/ai" className="btn orange">
              AI 찾기
            </Link>
            <button className="btn">로그인</button>
          </>
        }
      />
      <MovieBar active="home" />

      <div className="wrap">
        <div className="hero">
          <div>
            <span className="pill orange">이번 주 영화 1위</span>
            <h1>
              극장에서 시작해
              <br />
              이야기로 이어지는 영화
            </h1>
            <p>국내외 영화 정보, 평점, 리뷰와 실시간 갤러리를 한곳에서 만나보세요.</p>
            <div className="actions">
              <Link href="/movies/1" className="btn orange">
                검은 파도의 밤 보기
              </Link>
            </div>
          </div>
          <div className="hero-grid">
            <div className="genre">
              <small>미스터리</small>
              <b>검은 파도의 밤</b>
            </div>
            <div className="genre">
              <small>독립 영화</small>
              <b>여름의 증언</b>
            </div>
            <div className="genre">
              <small>애니메이션</small>
              <b>별의 정원</b>
            </div>
            <div className="genre">
              <small>다큐멘터리</small>
              <b>숲이 기억하는 것</b>
            </div>
          </div>
        </div>

        <div className="section" style={{ borderTop: 0, paddingTop: 0 }}>
          <div className="headrow">
            <div>
              <h2>지금 상영 중</h2>
              <div className="sub">극장 상영작을 평점과 예매 화제성으로 정렬했어요</div>
            </div>
            <div className="tabs">
              <button className="tab on">전체</button>
              <button className="tab">한국</button>
              <button className="tab">해외</button>
              <button className="tab">독립·예술</button>
            </div>
          </div>
          <div className="posters">
            {NOW_SHOWING.map((item) => (
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
              <h2 style={{ fontSize: 23 }}>영화 소식과 큐레이션</h2>
              <div className="history">
                {NEWS.map((n) => (
                  <div key={n.title} className="feedrow">
                    <span>
                      <span className="pill" style={{ marginRight: 8 }}>
                        {n.tag}
                      </span>
                      {n.title}
                    </span>
                    <small className="muted">{n.time}</small>
                  </div>
                ))}
              </div>
            </div>
            <div className="card rank">
              <h2 style={{ fontSize: 23 }}>실시간 영화 순위</h2>
              {RANKING.map((r) => (
                <div key={r.rank} className="rankrow">
                  <b>{r.rank}</b>
                  <span>{r.title}</span>
                  <small>{r.change}</small>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <SiteFooter
        title="모든 매체를 한곳에서"
        subtitle="영화, 드라마, 애니, 웹툰, 웹소설을 통합 검색하고 평가하세요."
      />
    </>
  );
}
