import Link from "next/link";
import SiteFooter from "@/components/site-footer";
import AuthStatus from "@/components/auth-status";
import HomeRecommendations from "@/components/home-recommendations";
import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchTopRatedContent, fetchRecentMovies, type MovieListItem } from "@/lib/movies/queries";
import { fetchCommunityFeed, fetchTrendingGalleries, type FeedPostItem, type TrendingGallery } from "@/lib/community/queries";

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

  const [heroMovie, heroDrama, heroAnime, trending, hotPosts, trendingGalleries] = supabase
    ? await Promise.all([
        fetchRecentMovies(supabase, 1, "MOVIE"),
        fetchRecentMovies(supabase, 1, "DRAMA"),
        fetchRecentMovies(supabase, 1, "ANIME"),
        fetchTopRatedContent(supabase, 5, activeTab.contentTypes),
        fetchCommunityFeed(supabase, "comments", 3),
        fetchTrendingGalleries(supabase, 4),
      ])
    : [[], [], [], [], [], []];

  const heroTiles: { type: string; title: string; href: string; poster_url: string | null }[] = [
    ...(heroMovie[0]
      ? [{ type: "MOVIE", title: heroMovie[0].canonical_title, href: `/movies/${heroMovie[0].id}`, poster_url: heroMovie[0].poster_url }]
      : []),
    ...(heroDrama[0]
      ? [{ type: "DRAMA", title: heroDrama[0].canonical_title, href: `/movies/${heroDrama[0].id}`, poster_url: heroDrama[0].poster_url }]
      : []),
    ...(heroAnime[0]
      ? [{ type: "ANIME", title: heroAnime[0].canonical_title, href: `/movies/${heroAnime[0].id}`, poster_url: heroAnime[0].poster_url }]
      : []),
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
          <form action="/movies/search" method="get" className="search">
            <input
              type="text"
              name="q"
              placeholder="제목, 인물, 장면을 검색해보세요"
              style={{
                width: "100%",
                border: "none",
                background: "transparent",
                font: "inherit",
                color: "inherit",
                outline: "none",
              }}
            />
            <button type="submit" style={{ all: "unset", cursor: "pointer" }} aria-label="검색">
              <i />
            </button>
          </form>
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
              <Link
                key={tile.href}
                href={tile.href}
                className="genre"
                style={tile.poster_url ? { position: "relative", overflow: "hidden" } : undefined}
              >
                {tile.poster_url && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={tile.poster_url}
                      alt={tile.title}
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "linear-gradient(to top, rgba(0,0,0,.8), rgba(0,0,0,.05) 55%)",
                      }}
                    />
                  </>
                )}
                <small style={tile.poster_url ? { position: "relative" } : undefined}>{tile.type}</small>
                <strong style={tile.poster_url ? { position: "relative" } : undefined}>{tile.title}</strong>
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
                  <div
                    className={`poster ${TONES[i % TONES.length]}`}
                    style={item.poster_url ? { position: "relative", overflow: "hidden" } : undefined}
                  >
                    {item.poster_url && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.poster_url}
                          alt={item.canonical_title}
                          style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            background: "linear-gradient(to top, rgba(0,0,0,.8), rgba(0,0,0,.05) 55%)",
                          }}
                        />
                      </>
                    )}
                    <small style={item.poster_url ? { position: "relative" } : undefined}>
                      {heroTag(item, item.content_type)}
                    </small>
                    <strong style={item.poster_url ? { position: "relative" } : undefined}>
                      {item.canonical_title}
                    </strong>
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
              <h2 style={{ fontSize: 24 }}>지금 활발한 갤러리</h2>
              {trendingGalleries.length === 0 ? (
                <p className="muted">아직 데이터가 없어요.</p>
              ) : (
                trendingGalleries.map((g: TrendingGallery, i: number) => (
                  <div key={g.id} className="rankrow">
                    <b>{i + 1}</b>
                    <span>{g.name}</span>
                    <small>게시글 {g.post_count.toLocaleString()}</small>
                  </div>
                ))
              )}
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
