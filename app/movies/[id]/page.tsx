import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchMovieDetail, fetchContentRelations } from "@/lib/movies/queries";
import { fetchContentVideos, fetchContentWatchProviders } from "@/lib/movies/media";
import {
  formatCountry,
  formatRuntime,
  formatStatus,
  formatContentTypeLabel,
  formatRelationType,
} from "@/lib/movies/format";
import { fetchReviews, fetchContentTagVotePercentages } from "@/lib/reviews/queries";
import { getOrCreateContentGallery, fetchGallery, fetchGalleryPosts } from "@/lib/community/queries";
import RatingWidget from "@/components/reviews/rating-widget";
import WatchlistButton from "@/components/watchlist-button";
import CollectionPickerButton from "@/components/collection-picker-button";
import MovieQaBox from "@/components/movie-qa-box";
import AuthStatus from "@/components/auth-status";

export const revalidate = 60;

// NOTE: this route also serves as the detail page for DRAMA and ANIME
// content (fetchMovieDetail fetches by id regardless of content_type) —
// the URL segment stays "/movies/{id}" for all content types deliberately,
// to avoid a larger route-renaming refactor right now. Copy below branches
// on movie.content_type where it matters (see formatContentTypeLabel).

const VIDEO_TYPE_LABELS: Record<string, string> = {
  TRAILER: "예고편",
  TEASER: "티저",
  INTERVIEW: "인터뷰",
  OST: "OST",
  CLIP: "영상 클립",
};

const PROVIDER_TYPE_LABELS: Record<string, string> = {
  STREAMING: "스트리밍",
  RENT: "대여",
  BUY: "구매",
  THEATER: "극장",
};

export default async function MovieDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = getSupabaseClient();
  const movie = supabase ? await fetchMovieDetail(supabase, id) : null;

  if (!movie) notFound();

  const [videos, watchProviders, reviews, tagPercentages, relations] = supabase
    ? await Promise.all([
        fetchContentVideos(supabase, movie.id),
        fetchContentWatchProviders(supabase, movie.id),
        fetchReviews(supabase, movie.id, "helpful"),
        fetchContentTagVotePercentages(supabase, movie.id),
        fetchContentRelations(supabase, movie.id),
      ])
    : [[], [], [], [], []];

  const galleryId = supabase ? await getOrCreateContentGallery(supabase, movie.id) : null;
  const [gallery, galleryPosts] =
    galleryId && supabase
      ? await Promise.all([
          fetchGallery(supabase, galleryId),
          fetchGalleryPosts(supabase, galleryId, "comments", 3),
        ])
      : [null, []];

  const galleryPostCount = gallery?.post_count ?? 0;
  const topReview = reviews[0] ?? null;
  const topTags = [...tagPercentages].filter((t) => t.votes > 0).sort((a, b) => b.percentage - a.percentage).slice(0, 3);

  const genreNames = movie.content_genre.map((cg) => cg.genre?.name).filter(Boolean);
  const releaseYear = movie.release_date?.slice(0, 4);
  const country = formatCountry(movie.country_code);
  const runtime = formatRuntime(movie.runtime_minutes);
  const subLine = [movie.original_title, country, runtime].filter(Boolean).join(" · ");
  const contentTypeLabel = formatContentTypeLabel(movie.content_type);

  return (
    <>
      <SiteHeader
        active="content"
        searchPlaceholder="작품 안에서 검색"
        actions={<AuthStatus />}
      />

      <div className="wrap">
        <div className="detail-hero">
          <div className="cover">
            {movie.poster_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={movie.poster_url}
                alt={movie.canonical_title}
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 14 }}
              />
            ) : (
              <>
                <small>{movie.content_type}</small>
                <strong>{movie.canonical_title}</strong>
                <small>{movie.original_title ?? ""}</small>
              </>
            )}
          </div>
          <div className="detail-copy">
            <span className="eyebrow">
              {contentTypeLabel}{releaseYear ? ` · ${releaseYear}` : ""}
            </span>
            <h1>{movie.canonical_title}</h1>
            {subLine && <div className="original">{subLine}</div>}
            {genreNames.length > 0 && (
              <div className="tagrow">
                {genreNames.map((name, i) => (
                  <span key={name} className={i === 0 ? "pill dark" : "pill"}>
                    {name}
                  </span>
                ))}
              </div>
            )}
            {movie.synopsis_short && <p className="synopsis">{movie.synopsis_short}</p>}
            <div className="facts">
              <b>감독</b>
              <span>{movie.director ?? "정보 없음"}</span>
              <b>출연</b>
              <span>
                {movie.cast_names && movie.cast_names.length > 0
                  ? movie.cast_names.join(" · ")
                  : "정보 없음"}
              </span>
              <b>공개</b>
              <span>
                {movie.release_date ?? "미정"} · {formatStatus(movie.status)}
              </span>
              <b>관람 등급</b>
              <span>{movie.age_rating ?? "정보 없음"}</span>
            </div>
            <div className="actions">
              <WatchlistButton contentId={movie.id} />
              <CollectionPickerButton contentId={movie.id} />
              <button className="btn ghost">공유</button>
            </div>
          </div>
          <aside className="card scorebox">
            <div className="eyebrow">TMDB 평점</div>
            {movie.external_rating != null ? (
              <>
                <div className="scoretop">
                  <strong>{movie.external_rating.toFixed(1)}</strong>
                  <span className="muted">/ 10</span>
                </div>
                <div className="stars" style={{ fontSize: 22, marginTop: 8 }}>
                  {"★".repeat(Math.round(movie.external_rating / 2))}
                  {"☆".repeat(5 - Math.round(movie.external_rating / 2))}
                </div>
                <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                  {movie.external_rating_count?.toLocaleString() ?? 0}명 참여 (TMDB)
                </div>
              </>
            ) : (
              <div className="muted" style={{ marginTop: 8 }}>
                아직 평점 정보가 없어요.
              </div>
            )}
            <div className="eyebrow" style={{ marginTop: 20 }}>
              나라타 평점
            </div>
            {movie.rating_count > 0 ? (
              <>
                <div className="scoretop">
                  <strong>{movie.average_rating.toFixed(1)}</strong>
                  <span className="muted">/ 5</span>
                </div>
                <div className="stars" style={{ fontSize: 22, marginTop: 8 }}>
                  {"★".repeat(Math.round(movie.average_rating))}
                  {"☆".repeat(5 - Math.round(movie.average_rating))}
                </div>
                <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                  {movie.rating_count.toLocaleString()}명 참여
                </div>
              </>
            ) : (
              <div className="muted" style={{ marginTop: 8 }}>
                아직 나라타 평점이 없어요. 첫 별점을 남겨보세요.
              </div>
            )}
            <RatingWidget contentId={movie.id} />
          </aside>
        </div>

        <nav className="detail-tabs">
          <span className="on">주요 정보</span>
          <Link href={`/movies/${id}/reviews`}>평점·리뷰</Link>
          <a href="#videos">영상·OST</a>
          <a href="#related">관련 작품</a>
          <Link href={`/movies/${id}/gallery`}>
            갤러리{galleryPostCount > 0 && <>{" "}<b className="orange">{galleryPostCount}</b></>}
          </Link>
        </nav>

        <div className="section" id="videos">
          <div className="detail-grid">
            <div className="card panel">
              <h3>회차 및 부가 영상</h3>
              {videos.length > 0 ? (
                <div className="episodes">
                  {videos.map((video) => (
                    <a
                      key={video.id}
                      className="episode"
                      href={video.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ textDecoration: "none" }}
                    >
                      <b>{video.title}</b>
                      <span>
                        {VIDEO_TYPE_LABELS[video.video_type] ?? video.video_type}
                        {video.provider_label ? ` · ${video.provider_label}` : ""}
                      </span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="muted">아직 등록된 영상이 없어요.</p>
              )}
            </div>
            <div className="card panel">
              <h3>볼 수 있는 곳</h3>
              {watchProviders.length > 0 ? (
                <>
                  <div className="providers">
                    {watchProviders.map((wp, i) => {
                      const label = wp.provider?.name ?? "정보 없음";
                      const content = (
                        <>
                          {label}
                          {PROVIDER_TYPE_LABELS[wp.type] ? ` (${PROVIDER_TYPE_LABELS[wp.type]})` : ""}
                        </>
                      );
                      const toneClass = i % 3 === 1 ? " tone-2" : i % 3 === 2 ? " tone-3" : "";
                      return wp.url ? (
                        <a
                          key={`${wp.provider?.name}-${wp.type}`}
                          className={`provider${toneClass}`}
                          href={wp.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ textDecoration: "none" }}
                        >
                          {content}
                        </a>
                      ) : (
                        <div key={`${wp.provider?.name}-${wp.type}`} className={`provider${toneClass}`}>
                          {content}
                        </div>
                      );
                    })}
                  </div>
                  <p className="sub" style={{ marginTop: 15 }}>
                    제공 정보는 지역과 시점에 따라 달라질 수 있어요.
                  </p>
                </>
              ) : (
                <p className="muted">아직 등록된 시청처 정보가 없어요.</p>
              )}
            </div>
          </div>
        </div>

        <div className="section" id="related">
          <div className="headrow">
            <div>
              <h2>관련 작품과 세계관</h2>
              <div className="sub">원작, 각색작, 같은 세계관을 연결해 보여줍니다</div>
            </div>
          </div>
          {relations.length > 0 ? (
            <div className="related">
              {relations.map((rel, i) => (
                <Link
                  key={rel.content_id}
                  href={`/movies/${rel.content_id}`}
                  className={i % 2 === 1 ? "rel alt" : "rel"}
                >
                  <small>{formatRelationType(rel.relation_type)}</small>
                  <b>{rel.canonical_title}</b>
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted">아직 연결된 관련 작품이 없어요.</p>
          )}
        </div>

        <div className="section">
          <div className="detail-grid">
            <div className="card panel">
              <div className="headrow" style={{ margin: 0 }}>
                <h3>작품 갤러리 인기글</h3>
                <Link href={`/movies/${id}/gallery`} className="pill orange">
                  갤러리 보기
                </Link>
              </div>
              {galleryPosts.length > 0 ? (
                galleryPosts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/movies/${id}/gallery/${post.id}`}
                    className="feedrow"
                  >
                    <span>
                      [{post.head}] {post.title}
                    </span>
                    <b>{post.comment_count}</b>
                  </Link>
                ))
              ) : (
                <p className="muted" style={{ padding: "12px 0" }}>
                  아직 갤러리에 게시글이 없어요.
                </p>
              )}
            </div>
            <div className="card panel">
              <h3>리뷰 요약</h3>
              {topReview ? (
                <p className="synopsis" style={{ margin: 0 }}>
                  {topReview.contains_spoiler && (
                    <span className="pill orange" style={{ marginRight: 8 }}>
                      스포일러 포함
                    </span>
                  )}
                  “{topReview.body}”
                </p>
              ) : (
                <p className="muted" style={{ margin: 0 }}>
                  아직 작성된 리뷰가 없어요. 첫 리뷰를 남겨보세요.
                </p>
              )}
              {topTags.length > 0 && (
                <div className="tagrow">
                  {topTags.map((tag) => (
                    <span key={tag.tag_id} className="pill">
                      {tag.name} {tag.percentage}%
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <MovieQaBox contentId={movie.id} />
        </div>
      </div>

      <SiteFooter
        title="작품에서 시작하는 대화"
        subtitle="평점, 갤러리, 관계작을 한 화면에서 확인하세요."
      />
    </>
  );
}
