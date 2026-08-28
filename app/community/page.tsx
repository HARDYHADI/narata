import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";

const BOARD_ROWS = [
  {
    kind: "notice" as const,
    num: "공지",
    head: "필독",
    title: "커뮤니티 이용 규칙 및 스포일러 표기 안내",
    user: "운영자",
    views: "18,402",
    likes: "271",
  },
  {
    kind: "hot" as const,
    num: "10428",
    head: "분석",
    title: "검은 파도의 밤 마지막 장면 파도 방향 반대임",
    comments: 128,
    user: "ㅇㅇ(39.7)",
    views: "8,291",
    likes: "344",
  },
  {
    kind: "hot" as const,
    num: "10426",
    head: "감상",
    title: "이번 호랑이의 계절 92화 보고 온 사람만",
    comments: 94,
    user: "솔방울",
    views: "5,116",
    likes: "211",
  },
  {
    kind: "normal" as const,
    num: "10425",
    head: "질문",
    title: "별의 정원 2기 원작 어디부터 읽으면 됨?",
    comments: 37,
    user: "ㅇㅇ(118.2)",
    views: "1,083",
    likes: "42",
  },
  {
    kind: "normal" as const,
    num: "10424",
    head: "정보",
    title: "8월 마지막 주 OTT 신작 한 번에 정리",
    comments: 52,
    user: "극장앞",
    views: "2,871",
    likes: "187",
  },
  {
    kind: "normal" as const,
    num: "10423",
    head: "추천",
    title: "로맨스 적고 정치질 많은 회귀 웹소설 추천함",
    comments: 66,
    user: "책갈피",
    views: "3,209",
    likes: "154",
  },
  {
    kind: "normal" as const,
    num: "10422",
    head: "창작",
    title: "여섯 번째 등대 팬아트 그려옴",
    comments: 81,
    user: "나무결",
    views: "4,010",
    likes: "391",
  },
  {
    kind: "normal" as const,
    num: "10421",
    head: "재미",
    title: "드라마판 등장인물 관계도 내 마음대로 요약",
    comments: 29,
    user: "ㅇㅇ(211.4)",
    views: "1,442",
    likes: "68",
  },
  {
    kind: "normal" as const,
    num: "10420",
    head: "감상",
    title: "푸른 우체국은 6화부터 분위기 확 달라지네",
    comments: 43,
    user: "늦은밤",
    views: "2,063",
    likes: "96",
  },
  {
    kind: "normal" as const,
    num: "10419",
    head: "질문",
    title: "이 대사 나오는 영화 제목 아는 사람?",
    comments: 74,
    user: "ㅇㅇ(58.9)",
    views: "3,517",
    likes: "121",
  },
  {
    kind: "normal" as const,
    num: "10418",
    head: "정보",
    title: "오늘 GV 취소표 풀림, 시간 정리",
    comments: 18,
    user: "파도타기",
    views: "908",
    likes: "34",
  },
];

const LIVE_TICKER = [
  { type: "영화", title: "스포 없이 검은 파도 후기 세 줄", time: "방금", comments: 3 },
  { type: "웹툰", title: "목요일 연재작 휴재 공지 모음", time: "1분 전", comments: 7 },
  { type: "애니", title: "이번 분기 작화 좋은 거 뭐 있음", time: "2분 전", comments: 12 },
];

const TRENDING_GALLERIES = [
  { rank: 1, name: "호랑이의 계절", change: "+28%" },
  { rank: 2, name: "검은 파도의 밤", change: "+17%" },
  { rank: 3, name: "8월 신작 애니", change: "+12%" },
  { rank: 4, name: "회귀물 추천", change: "+9%" },
  { rank: 5, name: "OTT 드라마", change: "+7%" },
];

const GALLERY_TAGS = [
  { label: "영화", dark: true },
  { label: "한국 드라마" },
  { label: "애니" },
  { label: "웹툰" },
  { label: "웹소설" },
  { label: "미스터리" },
  { label: "신작" },
  { label: "완결작" },
];

export default function CommunityPage() {
  return (
    <>
      <SiteHeader
        active="community"
        searchPlaceholder="갤러리·게시글 검색"
        actions={
          <>
            <button className="btn orange">글쓰기</button>
            <button className="btn">로그인</button>
          </>
        }
      />

      <div className="wrap">
        <div className="page-title">
          <div>
            <span className="eyebrow">NARATA COMMUNITY</span>
            <h1>이야기 광장</h1>
            <p>작품과 매체를 중심으로 빠르게 이야기하고, 필요한 정보는 구조적으로 모아요.</p>
          </div>
          <div className="tabs">
            <button className="tab on">전체 인기</button>
            <button className="tab">최신글</button>
            <button className="tab">내 갤러리</button>
          </div>
        </div>

        <div className="comm-layout">
          <div>
            <div className="board-card">
              <div className="board-tools">
                <span className="pill dark">실시간 베스트</span>
                <span className="pill">스포일러 숨김 ON</span>
                <div className="grow" />
                <button className="tab">추천순</button>
                <button className="tab on">댓글순</button>
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

            <div className="card realtime">
              <div className="headrow" style={{ margin: 0 }}>
                <h2 style={{ fontSize: 21 }}>방금 올라온 글</h2>
                <span className="pill orange">LIVE</span>
              </div>
              {LIVE_TICKER.map((item) => (
                <div key={item.title} className="ticker">
                  <span>{item.type}</span>
                  <span>{item.title}</span>
                  <span>{item.time}</span>
                  <b>댓글 {item.comments}</b>
                </div>
              ))}
            </div>
          </div>

          <aside className="side">
            <div className="card sidebox">
              <h3>급상승 갤러리</h3>
              {TRENDING_GALLERIES.map((g) => (
                <div key={g.rank} className="trend">
                  <b>{g.rank}</b>
                  <span>{g.name}</span>
                  <small>{g.change}</small>
                </div>
              ))}
            </div>
            <div className="card sidebox">
              <h3>갤러리 탐색</h3>
              <div className="gallery">
                {GALLERY_TAGS.map((tag) => (
                  <span key={tag.label} className={`pill${tag.dark ? " dark" : ""}`}>
                    {tag.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="card sidebox">
              <h3>내 활동</h3>
              <div className="trend">
                <span>글</span>
                <b>12</b>
                <small>이번 달</small>
              </div>
              <div className="trend">
                <span>댓글</span>
                <b>48</b>
                <small>이번 달</small>
              </div>
              <button className="btn orange" style={{ width: "100%", marginTop: 10 }}>
                내 갤러리 관리
              </button>
            </div>
          </aside>
        </div>
      </div>

      <SiteFooter
        title="낮은 진입장벽, 명확한 운영 기준"
        subtitle="신고 · 차단 · 스포일러 · 작품 연결을 기본으로 제공합니다."
      />
    </>
  );
}
