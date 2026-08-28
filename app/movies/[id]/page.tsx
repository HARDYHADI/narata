import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchMovieDetail } from "@/lib/movies/queries";
import { formatCountry, formatRuntime, formatStatus } from "@/lib/movies/format";

export const revalidate = 60;

// NOTE: director/cast, age rating, videos/OST, watch providers, related
// works, and gallery/review activity aren't backed by real data yet (no
// credits, certification, or community tables). Those sections stay as
// static sample content from the approved design until that schema exists.

export default async function MovieDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = getSupabaseClient();
  const movie = supabase ? await fetchMovieDetail(supabase, id) : null;

  if (!movie) notFound();

  const genreNames = movie.content_genre.map((cg) => cg.genre?.name).filter(Boolean);
  const releaseYear = movie.release_date?.slice(0, 4);
  const country = formatCountry(movie.country_code);
  const runtime = formatRuntime(movie.runtime_minutes);
  const subLine = [movie.original_title, country, runtime].filter(Boolean).join(" · ");

  return (
    <>
      <SiteHeader
        active="content"
        searchPlaceholder="작품 안에서 검색"
        actions={<button className="btn">내 프로필</button>}
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
                <small>MOVIE</small>
                <strong>{movie.canonical_title}</strong>
                <small>{movie.original_title ?? ""}</small>
              </>
            )}
          </div>
          <div className="detail-copy">
            <span className="eyebrow">
              영화{releaseYear ? ` · ${releaseYear}` : ""}
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
              <span>정보 없음</span>
              <b>출연</b>
              <span>정보 없음</span>
              <b>공개</b>
              <span>
                {movie.release_date ?? "미정"} · {formatStatus(movie.status)}
              </span>
              <b>관람 등급</b>
              <span>정보 없음</span>
            </div>
            <div className="actions">
              <button className="btn orange">보고 싶어요</button>
              <button className="btn ghost">컬렉션에 추가</button>
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
            <div className="muted" style={{ fontSize: 12, marginTop: 16 }}>
              나라타 자체 평점은 아직 준비 중이에요.
            </div>
            <button className="btn orange ratebtn">내 별점 남기기</button>
          </aside>
        </div>

        <nav className="detail-tabs">
          <span className="on">주요 정보</span>
          <Link href={`/movies/${id}/reviews`}>평점·리뷰</Link>
          <a href="#videos">영상·OST</a>
          <a href="#related">관련 작품</a>
          <Link href={`/movies/${id}/gallery`}>
            갤러리 <b className="orange">328</b>
          </Link>
        </nav>

        <div className="section" id="videos">
          <div className="detail-grid">
            <div className="card panel">
              <h3>회차 및 부가 영상</h3>
              <div className="episodes">
                <div className="episode">
                  <b>공식 예고편</b>
                  <span>02:14 · YouTube</span>
                </div>
                <div className="episode">
                  <b>감독 인터뷰</b>
                  <span>08:32 · 공식 채널</span>
                </div>
                <div className="episode">
                  <b>OST 플레이리스트</b>
                  <span>12곡 · YouTube Music</span>
                </div>
              </div>
            </div>
            <div className="card panel">
              <h3>볼 수 있는 곳</h3>
              <div className="providers">
                <div className="provider">CGV</div>
                <div className="provider tone-2">WATCHA</div>
                <div className="provider tone-3">NETFLIX</div>
              </div>
              <p className="sub" style={{ marginTop: 15 }}>
                제공 정보는 지역과 시점에 따라 달라질 수 있어요.
              </p>
            </div>
          </div>
        </div>

        <div className="section" id="related">
          <div className="headrow">
            <div>
              <h2>관련 작품과 세계관</h2>
              <div className="sub">원작, 각색작, 같은 세계관을 연결해 보여줍니다</div>
            </div>
            <span className="pill">관계 그래프 보기</span>
          </div>
          <div className="related">
            <div className="rel">
              <small>원작 소설</small>
              <b>파도 아래 기록</b>
            </div>
            <div className="rel alt">
              <small>프리퀄 웹툰</small>
              <b>여섯 번째 등대</b>
            </div>
            <div className="rel">
              <small>감독 전작</small>
              <b>빈 항구</b>
            </div>
            <div className="rel alt">
              <small>비슷한 분위기</small>
              <b>침묵의 섬</b>
            </div>
          </div>
        </div>

        <div className="section">
          <div className="detail-grid">
            <div className="card panel">
              <div className="headrow" style={{ margin: 0 }}>
                <h3>작품 갤러리 인기글</h3>
                <Link href={`/movies/${id}/gallery`} className="pill orange">
                  지금 328명
                </Link>
              </div>
              <div className="feedrow">
                <span>[분석] 마지막 테이프의 파형 비교해봄</span>
                <b>86</b>
              </div>
              <div className="feedrow">
                <span>[감상] 이 영화는 두 번째가 진짜다</span>
                <b>54</b>
              </div>
              <div className="feedrow">
                <span>[정보] 감독 GV 핵심 내용 정리</span>
                <b>31</b>
              </div>
            </div>
            <div className="card panel">
              <h3>리뷰 요약</h3>
              <p className="synopsis" style={{ margin: 0 }}>
                “느린 전개를 견디면 강한 여운이 남는다”는 평가가 많아요. 촬영과 음향은 호평이 우세하며,
                결말 해석은 크게 두 갈래로 나뉩니다.
              </p>
              <div className="tagrow">
                <span className="pill">촬영이 아름다워요</span>
                <span className="pill">여운이 길어요</span>
              </div>
            </div>
          </div>
          <div className="qbox">
            <span className="pill orange">AI에게 질문</span>
            <b>이 작품에 대해 궁금한 점이 있나요?</b>
            <div className="prompt">“마지막 장면 해석을 스포일러 표시해서 알려줘”</div>
            <button className="btn orange">질문하기</button>
          </div>
        </div>
      </div>

      <SiteFooter
        title="작품에서 시작하는 대화"
        subtitle="평점, 갤러리, 관계작을 한 화면에서 확인하세요."
      />
    </>
  );
}
