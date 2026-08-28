import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";

const GALLERY_NAV = ["전체글", "인기글", "정보", "분석", "감상", "질문", "창작"];

const BOARD_ROWS = [
  {
    kind: "notice" as const,
    num: "공지",
    head: "필독",
    title: "갤러리 규칙 및 스포일러 표기 안내",
    user: "운영자",
    views: "18,402",
    likes: "271",
  },
  {
    kind: "hot" as const,
    num: "3281",
    head: "분석",
    title: "마지막 장면 파도 방향 반대인 거 캡처해봄",
    comments: 128,
    user: "ㅇㅇ(39.7)",
    views: "8,291",
    likes: "344",
  },
  {
    kind: "hot" as const,
    num: "3279",
    head: "감상",
    title: "두 번째 보고 왔는데 아버지 대사 완전 다르게 들림",
    comments: 94,
    user: "파도타기",
    views: "5,116",
    likes: "211",
  },
  {
    kind: "normal" as const,
    num: "3278",
    head: "질문",
    title: "엔딩에서 서윤이 들고 있던 테이프 몇 번임?",
    comments: 37,
    user: "ㅇㅇ(118.2)",
    views: "1,083",
    likes: "42",
  },
  {
    kind: "normal" as const,
    num: "3277",
    head: "정보",
    title: "오늘 감독 GV 핵심 내용 정리",
    comments: 52,
    user: "극장앞",
    views: "2,871",
    likes: "187",
  },
  {
    kind: "normal" as const,
    num: "3276",
    head: "분석",
    title: "녹음테이프 시간대 순서 정리하면 이거 맞음?",
    comments: 66,
    user: "책갈피",
    views: "3,209",
    likes: "154",
  },
  {
    kind: "normal" as const,
    num: "3275",
    head: "창작",
    title: "등대 장면 팬아트 그려옴",
    comments: 81,
    user: "나무결",
    views: "4,010",
    likes: "391",
  },
  {
    kind: "normal" as const,
    num: "3274",
    head: "재미",
    title: "섬 주민들 증언 신뢰도 내맘대로 티어표",
    comments: 29,
    user: "ㅇㅇ(211.4)",
    views: "1,442",
    likes: "68",
  },
  {
    kind: "normal" as const,
    num: "3273",
    head: "감상",
    title: "영화관 음향 좋은 데서 봐야 되는 이유",
    comments: 43,
    user: "늦은밤",
    views: "2,063",
    likes: "96",
  },
  {
    kind: "normal" as const,
    num: "3272",
    head: "질문",
    title: "원작 소설이랑 결말 다른 거 맞지?",
    comments: 74,
    user: "ㅇㅇ(58.9)",
    views: "3,517",
    likes: "121",
  },
  {
    kind: "normal" as const,
    num: "3271",
    head: "정보",
    title: "주말 무대인사 취소표 풀림",
    comments: 18,
    user: "파도타기",
    views: "908",
    likes: "34",
  },
];

const POPULAR_HEADS = [
  { label: "분석 842", on: true },
  { label: "감상 721" },
  { label: "질문 416" },
  { label: "정보 381" },
  { label: "창작 224" },
];

const RELATED_GALLERIES = [
  { rank: 1, name: "박해원 감독", note: "1.4천" },
  { rank: 2, name: "한국 미스터리", note: "8.2천" },
  { rank: 3, name: "원작 소설", note: "3.7천" },
];

export default async function MovieGalleryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;

  return (
    <>
      <SiteHeader
        active="content"
        searchPlaceholder="갤러리 게시글 검색"
        actions={
          <>
            <button className="btn orange">글쓰기</button>
            <button className="btn">로그인</button>
          </>
        }
      />
      <div className="moviebar">
        <div className="wrap moviebar-row">
          <b>검은 파도의 밤 갤러리</b>
          {GALLERY_NAV.map((label, i) => (
            <span key={label} className={i === 0 ? "on" : undefined}>
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="wrap">
        <div className="page-title">
          <div>
            <span className="eyebrow">MOVIE GALLERY</span>
            <h1>검은 파도의 밤 갤러리</h1>
            <p>현재 328명 참여 중 · 스포일러 제목 숨김이 적용되어 있습니다.</p>
          </div>
          <div className="tabs">
            <button className="tab on">스포일러 숨김 ON</button>
            <button className="tab">갤러리 규칙</button>
          </div>
        </div>

        <div className="comm-layout">
          <div>
            <div className="board-card">
              <div className="board-tools">
                <span className="pill orange">실시간 인기</span>
                <span className="pill">개봉 3주차</span>
                <div className="grow" />
                <button className="tab on">댓글순</button>
                <button className="tab">최신순</button>
              </div>
              <div className="board-head">
                <span>번호</span>
                <span>말머리</span>
                <span>제목</span>
                <span>작성자</span>
                <span>조회</span>
                <span>추천</span>
              </div>
              {BOARD_ROWS.map((row) => (
                <div
                  key={row.num}
                  className={`board-row${row.kind === "hot" ? " hot" : ""}${
                    row.kind === "notice" ? " notice" : ""
                  }`}
                >
                  <span className="num">{row.num}</span>
                  <span className="head">{row.kind === "notice" ? <b>{row.head}</b> : row.head}</span>
                  <span className="title">
                    {row.kind === "notice" ? <b>{row.title}</b> : row.title}
                    {"comments" in row && <em className="comment">[{row.comments}]</em>}
                  </span>
                  <span className="user">{row.user}</span>
                  <span className="views">{row.views}</span>
                  <span className="likes">{row.likes}</span>
                </div>
              ))}
            </div>
          </div>

          <aside className="side">
            <div className="card sidebox">
              <h3>갤러리 정보</h3>
              <div className="trend">
                <b>글</b>
                <span>3,281개</span>
                <small>오늘 +218</small>
              </div>
              <div className="trend">
                <b>댓글</b>
                <span>18,492개</span>
                <small>오늘 +1.2천</small>
              </div>
              <div className="trend">
                <b>인원</b>
                <span>328명</span>
                <small>접속 중</small>
              </div>
              <button className="btn orange" style={{ width: "100%", marginTop: 10 }}>
                갤러리 즐겨찾기
              </button>
            </div>
            <div className="card sidebox">
              <h3>인기 말머리</h3>
              <div className="gallery">
                {POPULAR_HEADS.map((h) => (
                  <span key={h.label} className={`pill${h.on ? " on" : ""}`}>
                    {h.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="card sidebox">
              <h3>연관 갤러리</h3>
              {RELATED_GALLERIES.map((g) => (
                <div key={g.rank} className="trend">
                  <b>{g.rank}</b>
                  <span>{g.name}</span>
                  <small>{g.note}</small>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>

      <SiteFooter
        title="작품 정보에서 바로 이어지는 대화"
        subtitle="평점·리뷰와 빠른 익명 커뮤니티를 분리하되 작품 엔티티로 연결합니다."
      />
    </>
  );
}
