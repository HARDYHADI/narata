import Link from "next/link";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";

const DISTRIBUTION = [
  { label: "5", pct: 78 },
  { label: "4", pct: 51 },
  { label: "3", pct: 21 },
  { label: "2", pct: 8 },
  { label: "1", pct: 4 },
];

const TAGS = [
  { label: "여운이 길어요 81%", on: true },
  { label: "촬영이 아름다워요 76%", on: true },
  { label: "음향이 인상적이에요 69%" },
  { label: "전개가 느려요 52%" },
  { label: "해석이 필요해요 48%" },
  { label: "두 번 보고 싶어요 41%" },
];

const REVIEWS = [
  {
    user: "파도타기",
    rating: "5.0",
    time: "2시간 전",
    body: "말보다 소리와 빈 공간이 더 많은 영화. 마지막 장면을 보고 처음부터 다시 떠올리게 되는 구조가 좋았다. 느린 영화에 익숙하지 않다면 초반은 조금 버거울 수 있음.",
    helpful: 328,
    comments: 42,
    spoiler: false,
  },
  {
    user: "늦은극장",
    rating: "4.5",
    time: "어제",
    body: "결말의 파도 방향이 앞 장면과 반대라는 걸 알고 나면 아버지의 기록을 다르게 보게 된다.",
    helpful: 211,
    comments: 31,
    spoiler: true,
  },
  {
    user: "섬마을",
    rating: "4.0",
    time: "3일 전",
    body: "촬영과 음향은 정말 좋은데 인물의 선택을 설명하지 않는 부분이 많다. 해석하는 재미를 좋아하면 추천.",
    helpful: 96,
    comments: 12,
    spoiler: false,
  },
];

export default async function MovieReviewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <SiteHeader active="content" actions={<button className="btn">내 프로필</button>} />

      <div className="wrap">
        <div className="page-title">
          <div>
            <span className="eyebrow">검은 파도의 밤</span>
            <h1>평점과 리뷰</h1>
            <p>별점 분포, 취향별 평가와 스포일러 리뷰를 확인하세요.</p>
          </div>
          <button className="btn orange">내 리뷰 작성</button>
        </div>

        <nav className="detail-tabs">
          <Link href={`/movies/${id}`}>주요 정보</Link>
          <span className="on">평점·리뷰</span>
          <Link href={`/movies/${id}#videos`}>영상·OST</Link>
          <Link href={`/movies/${id}#related`}>관련 작품</Link>
          <Link href={`/movies/${id}/gallery`}>갤러리</Link>
        </nav>

        <div className="section" style={{ borderTop: 0 }}>
          <div className="review-summary">
            <div className="card rating-card">
              <span className="eyebrow">평균 평점</span>
              <div className="bignum" style={{ fontSize: 47, fontWeight: 900 }}>
                4.6
              </div>
              <div className="stars" style={{ fontSize: 21 }}>
                ★★★★★
              </div>
              <div className="sub">12,842명 참여</div>
              <div className="bars" style={{ textAlign: "left" }}>
                {DISTRIBUTION.map((d) => (
                  <div key={d.label} className="bar">
                    <span>{d.label}</span>
                    <i style={{ ["--w" as string]: `${d.pct}%` }} />
                    <small>{d.pct}%</small>
                  </div>
                ))}
              </div>
            </div>

            <div className="card review-stats">
              <h2>리뷰에서 자주 언급된 요소</h2>
              <div className="sub">리뷰와 선택형 태그를 함께 분석했어요.</div>
              <div className="tag-cloud">
                {TAGS.map((tag) => (
                  <span key={tag.label} className={`pill${tag.on ? " on" : ""}`}>
                    {tag.label}
                  </span>
                ))}
              </div>
              <h3 style={{ marginTop: 25 }}>내 취향과의 일치</h3>
              <p className="synopsis">
                지우님이 높게 평가한 ‘서정적 미스터리’, ‘가족의 비밀’, ‘여운 있는 결말’ 요소와 강하게
                일치해요.
              </p>
              <span className="pill orange">취향 일치 92%</span>
            </div>
          </div>

          <div className="card write-box">
            <div>
              <b>이 작품을 어떻게 보셨나요?</b>
              <div className="sub">별점과 짧은 감상을 남기면 추천이 더 정교해져요.</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="stars" style={{ fontSize: 25 }}>
                ☆☆☆☆☆
              </span>
              <button className="btn orange">리뷰 작성</button>
            </div>
          </div>

          <div className="card review-list">
            <div style={{ padding: 22, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <b>리뷰 3,821개</b>
              <div className="tabs">
                <button className="tab on">추천순</button>
                <button className="tab">최신순</button>
                <button className="tab">내 취향순</button>
              </div>
            </div>
            {REVIEWS.map((r) => (
              <article key={r.user} className="review-item">
                <div className="review-head">
                  <b>
                    {r.user} <span className="stars">★ {r.rating}</span>
                  </b>
                  <span className="sub">{r.time}</span>
                </div>
                <p>
                  {r.spoiler && (
                    <span className="pill orange" style={{ marginRight: 8 }}>
                      스포일러 포함
                    </span>
                  )}
                  {r.body}
                </p>
                <div className="reaction">
                  <span>도움돼요 {r.helpful}</span>
                  <span>댓글 {r.comments}</span>
                  <span>신고</span>
                </div>
              </article>
            ))}
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
