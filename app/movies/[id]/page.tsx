import Link from "next/link";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";

// TODO: wire this screen up to the real content row (Supabase `content`,
// `content_genre`, `content_relation`, community/rating aggregates) once the
// rest of the schema (ratings, reviews, providers, episodes) exists. For now
// this renders the fixed sample content from the approved design.

export default async function MovieDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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
            <small>ORIGINAL SERIES</small>
            <strong>
              검은 파도의
              <br />밤
            </strong>
            <small>THE NIGHT OF BLACK WAVES</small>
          </div>
          <div className="detail-copy">
            <span className="eyebrow">MOVIE · 2026</span>
            <h1>검은 파도의 밤</h1>
            <div className="original">The Night of Black Waves · 한국 · 128분</div>
            <div className="tagrow">
              <span className="pill dark">미스터리</span>
              <span className="pill">드라마</span>
              <span className="pill">외딴 섬</span>
              <span className="pill">가족의 비밀</span>
              <span className="pill">느린 호흡</span>
            </div>
            <p className="synopsis">
              십 년 만에 고향 섬으로 돌아온 기록원 서윤은, 사라진 아버지가 남긴 녹음테이프에서 매일 밤
              같은 파도 소리를 듣는다. 섬 주민들의 서로 다른 기억을 따라갈수록 가족이 숨겨온 진실과
              마주한다.
            </p>
            <div className="facts">
              <b>감독</b>
              <span>박해원</span>
              <b>출연</b>
              <span>윤서진 · 김도현 · 한예리</span>
              <b>공개</b>
              <span>2026.08.14 · 극장 개봉</span>
              <b>관람 등급</b>
              <span>15세 이상 관람가</span>
            </div>
            <div className="actions">
              <button className="btn orange">보고 싶어요</button>
              <button className="btn ghost">컬렉션에 추가</button>
              <button className="btn ghost">공유</button>
            </div>
          </div>
          <aside className="card scorebox">
            <div className="eyebrow">NARATA SCORE</div>
            <div className="scoretop">
              <strong>4.6</strong>
              <span className="muted">/ 5.0</span>
            </div>
            <div className="stars" style={{ fontSize: 22, marginTop: 8 }}>
              ★★★★★
            </div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              평가 12,842개
            </div>
            <div className="bars">
              {[
                { label: "5", pct: 78 },
                { label: "4", pct: 49 },
                { label: "3", pct: 19 },
                { label: "2", pct: 8 },
                { label: "1", pct: 4 },
              ].map((b) => (
                <div key={b.label} className="bar">
                  <span>{b.label}</span>
                  <i style={{ ["--w" as string]: `${b.pct}%` }} />
                  <span>{b.pct}%</span>
                </div>
              ))}
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
