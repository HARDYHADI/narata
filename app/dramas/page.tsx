import Link from "next/link";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import CategoryBar from "@/components/category-bar";
import MovieCard from "@/components/movie-card";
import AuthStatus from "@/components/auth-status";
import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchRecentMovies } from "@/lib/movies/queries";

export const revalidate = 60;

// NOTE: weekly broadcast schedule and live "급상승" ranking have no real
// data source yet (same as the movie home page's static news/ranking
// sections) — these stay as static sample content from the approved design.

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

export default async function DramasPage() {
  const supabase = getSupabaseClient();
  const recentDramas = supabase ? await fetchRecentMovies(supabase, 10, "DRAMA") : [];
  const heroDramas = recentDramas.slice(0, 4);
  const featured = recentDramas[0];

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
            <span className="pill orange">최근 수집된 드라마</span>
            <h1>
              다음 화를 기다리는
              <br />
              사람들의 드라마
            </h1>
            <p>TMDB에서 수집한 드라마 정보를 평점, 장르와 함께 한곳에서 만나보세요.</p>
            {featured && (
              <div className="actions">
                <Link href={`/movies/${featured.id}`} className="btn orange">
                  {featured.canonical_title} 보기
                </Link>
              </div>
            )}
          </div>
          <div className="hero-grid">
            {heroDramas.length > 0 ? (
              heroDramas.map((drama) => (
                <div key={drama.id} className="genre">
                  <small>{drama.content_genre[0]?.genre?.name ?? "DRAMA"}</small>
                  <b>{drama.canonical_title}</b>
                </div>
              ))
            ) : (
              <div className="genre">
                <small>DRAMA</small>
                <b>아직 수집된 드라마가 없어요</b>
              </div>
            )}
          </div>
        </div>

        <div className="section" style={{ borderTop: 0, paddingTop: 0 }}>
          <div className="headrow">
            <div>
              <h2>최근 수집된 드라마</h2>
              <div className="sub">TMDB에서 가져온 드라마를 공개일 최신순으로 보여줍니다</div>
            </div>
          </div>
          {recentDramas.length === 0 ? (
            <p className="muted">아직 등록된 드라마가 없습니다.</p>
          ) : (
            <div className="content-grid">
              {recentDramas.map((drama) => (
                <MovieCard key={drama.id} movie={drama} />
              ))}
            </div>
          )}
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
