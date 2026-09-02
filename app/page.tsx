import Link from "next/link";
import SiteFooter from "@/components/site-footer";
import AuthStatus from "@/components/auth-status";
import HomeRecommendations from "@/components/home-recommendations";
import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchTopRatedContent, fetchRecentMovies, type MovieListItem } from "@/lib/movies/queries";
import { fetchCommunityFeed, type FeedPostItem } from "@/lib/community/queries";

export const revalidate = 60;

const CONTENT_NAV = [
  { label: "영화", href: "/movies" },
  { label: "드라마", href: "/dramas" },
  { label: "애니", href: "/anime" },
  { label: "만화", href: "/comics" },
  { label: "웹툰", href: "/webtoons" },
  { label: "웹소설", href: "/webnovels" },
];

const CONTENT_TYPE_LABELS: Record<string, string> = {
  MOVIE: "영화",
  DRAMA: "드라마",
  ANIME: "애니",
};

const TRENDING_TABS: { key: string; label: string; contentTypes: string[] }[] = [
  { key: "all", label: "전체", contentTypes: ["MOVIE", "DRAMA", "ANIME"] },
  { key: "movie", label: "영화", contentTypes: ["MOVIE"] },
  { key: "drama", label: "드라마", contentTypes: ["DRAMA"] },
  { key: "anime", label: "애니", contentTypes: ["ANIME"] },
  { key: "webtoon", label: "웹툰", contentTypes: ["WEBTOON"] },
];

const TONES = ["tone-1", "tone-2", "tone-3", "tone-4", "tone-5"];

const RANKING = [
  { rank: 1, title: "호랑이의 계절", change: "▲ 12" },
  { rank: 2, title: "검은 파도의 밤", change: "▲ 7" },
  { rank: 3, title: "푸른 우체국", change: "NEW" },
  { rank: 4, title: "회귀한 서기관", change: "▲ 3" },
];

function heroTag(movie: MovieListItem, contentType: string): string {
  const year = movie.release_date?.slice(0, 4);
  const genre = movie.content_genre[0]?.genre?.name;
  return [CONTENT_TYPE_LABELS[contentType] ?? contentType, year ?? genre].filter(Boolean).join(" · ");
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const activeTab = TRENDING_TABS.find((t) => t.key === category) ?? TRENDING_TABS[0];

  const supabase = getSupabaseClient();

  const [heroMovie, heroDrama, heroAnime, trending, hotPosts] = supabase
    ? await Promise.all([
        fetchRecentMovies(supabase, 1, "MOVIE"),
        fetchRecentMovies(supabase, 1, "DRAMA"),
        fetchRecentMovies(supabase, 1, "ANIME"),
        fetchTopRatedContent(supabase, 5, activeTab.contentTypes),
        fetchCommunityFeed(supabase, "comments", 3),
      ])
    : [[], [], [], [], []];

  const heroTiles: { type: string; title: string; href: string }[] = [
    ...(heroMovie[0] ? [{ type: "MOVIE", title: heroMovie[0].canonical_title, href: `/movies/${heroMovie[0].id}` }] : []),
    ...(heroDrama[0] ? [{ type: "DRAMA", title: heroDrama[0].canonical_title, href: `/movies/${heroDrama[0].id}` }] : []),
    ...(heroAnime[0] ? [{ type: "ANIME", title: heroAnime[0].canonical_title, href: `/movies/${heroAnime[0].id}` }] : []),
  ];

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
          <AuthStatus />
        </div>
      </header>

      <div className="wrap">
        <div className="hero">
          <div>
            <span className="pill orange">모든 매체를 한곳에서</span>
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
            {heroTiles.map((tile) => (
              <Link key={tile.href} href={tile.href} className="genre">
                <small>{tile.type}</small>
                <strong>{tile.title}</strong>
              </Link>
            ))}
            {heroTiles.length < 4 && (
              <div className="genre">
                <small>WEBTOON · WEBNOVEL</small>
                <strong>매체 준비 중이에요</strong>
              </div>
            )}
          </div>
        </div>

        <div className="section" style={{ borderTop: 0, paddingTop: 0 }}>
          <div className="headrow">
            <div>
              <h2>지금 가장 많이 보는 작품</h2>
              <div className="sub">TMDB 평점 기준으로 매체별 인기작을 보여드려요</div>
            </div>
            <div className="tabs">
              {TRENDING_TABS.map((tab) => (
                <Link
                  key={tab.key}
                  href={tab.key === "all" ? "/" : `/?category=${tab.key}`}
                  className={`tab${tab.key === activeTab.key ? " on" : ""}`}
                >
                  {tab.label}
                </Link>
              ))}
            </div>
          </div>
          {trending.length === 0 ? (
            <p className="muted">아직 수집된 작품이 없어요.</p>
          ) : (
            <div className="posters">
              {trending.map((item: MovieListItem, i: number) => (
                <Link key={item.id} href={`/movies/${item.id}`}>
                  <div className={`poster ${TONES[i % TONES.length]}`}>
                    <small>{heroTag(item, item.content_type)}</small>
                    <strong>{item.canonical_title}</strong>
                  </div>
                  <div className="meta">
                    <b>{item.canonical_title}</b>
                    {item.external_rating != null && (
                      <span className="stars">★ {item.external_rating.toFixed(1)}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="section">
          <div className="home-lower">
            <HomeRecommendations />
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
              {hotPosts.length === 0 ? (
                <p className="muted" style={{ padding: "12px 0" }}>
                  아직 등록된 글이 없어요.
                </p>
              ) : (
                hotPosts.map((p: FeedPostItem) => {
                  const contentId = p.gallery?.content?.id;
                  const body = (
                    <>
                      <span>{p.title}</span>
                      <b>{p.comment_count}</b>
                    </>
                  );
                  return contentId ? (
                    <Link key={p.id} href={`/movies/${contentId}/gallery/${p.id}`} className="feedrow">
                      {body}
                    </Link>
                  ) : (
                    <div key={p.id} className="feedrow">
                      {body}
                    </div>
                  );
                })
              )}
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
