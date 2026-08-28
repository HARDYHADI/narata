import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";

const LIKED_TAGS = [
  { label: "서정적 미스터리", strong: true },
  { label: "성장 서사", strong: true },
  { label: "여운 있는 결말", strong: true },
  { label: "느린 호흡" },
  { label: "가족의 비밀" },
  { label: "작은 공동체" },
  { label: "관계 중심" },
  { label: "따뜻한 분위기" },
  { label: "낮은 로맨스 비중" },
];

const AVOID_TAGS = [
  { label: "과도한 고어", avoid: true },
  { label: "삼각관계 중심", avoid: true },
  { label: "100화 이상 장편", avoid: true },
  { label: "점프 스케어" },
];

const HISTORY = [
  { title: "검은 파도의 밤", type: "영화", rating: "4.5" },
  { title: "호랑이의 계절", type: "웹툰", rating: "5.0" },
  { title: "푸른 우체국", type: "애니", rating: "4.0" },
  { title: "회귀한 서기관", type: "웹소설", rating: "3.5" },
];

const CONTROLS = [
  { label: "이미 본 작품은 추천에서 제외", on: true },
  { label: "같은 프랜차이즈 연속 추천 제한", on: true },
  { label: "커뮤니티 활동도 취향에 반영", on: true },
  { label: "성인 콘텐츠 포함", on: false },
];

const AI_LOGS = [
  { title: "그림 속 세계로 들어가는 2000년대 영화", note: "후보 3개 · 2시간 전" },
  { title: "로맨스가 적은 회귀 웹소설 추천", note: "추천 8개 · 어제" },
  { title: "12화 이내의 따뜻한 성장 애니", note: "추천 6개 · 3일 전" },
];

export default function TastePage() {
  return (
    <>
      <SiteHeader
        active="taste"
        actions={
          <>
            <button className="btn ghost">설정</button>
            <button className="btn">프로필 공유</button>
          </>
        }
      />

      <div className="wrap">
        <div className="page-title">
          <div>
            <span className="eyebrow">MY TASTE</span>
            <h1>지우님의 이야기 취향</h1>
            <p>평가와 활동을 바탕으로 추천 기준을 확인하고 직접 조정할 수 있어요.</p>
          </div>
          <span className="pill orange">취향 데이터 78% 완성</span>
        </div>

        <div className="profile">
          <div className="card profile-main">
            <div className="avatar">N</div>
            <div className="profile-copy">
              <h2>파도타기</h2>
              <div className="muted">미스터리와 성장물 사이를 여행하는 다매체 탐색자</div>
              <div className="stats">
                <div className="stat">
                  <b>286</b>
                  <span className="sub">평가</span>
                </div>
                <div className="stat">
                  <b>42</b>
                  <span className="sub">리뷰</span>
                </div>
                <div className="stat">
                  <b>18</b>
                  <span className="sub">컬렉션</span>
                </div>
                <div className="stat">
                  <b>4.2</b>
                  <span className="sub">평균 별점</span>
                </div>
              </div>
            </div>
          </div>
          <div className="card sync">
            <span className="pill orange">이번 주 변화</span>
            <h3>애니 취향이 더 선명해졌어요</h3>
            <p>최근 평가한 8개 작품에서 ‘짧은 회차’와 ‘따뜻한 성장’ 신호가 강해졌습니다.</p>
            <button className="btn orange">추천 새로 보기</button>
          </div>
        </div>

        <div className="taste-grid">
          <div className="taste-col">
            <div className="card taste-panel">
              <h3>내가 좋아하는 요소</h3>
              <div className="sub">진하게 표시될수록 추천에 더 크게 반영됩니다.</div>
              <div className="tag-cloud">
                {LIKED_TAGS.map((tag) => (
                  <span key={tag.label} className={`tag${tag.strong ? " strong" : ""}`}>
                    {tag.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="card taste-panel">
              <div className="headrow" style={{ margin: 0 }}>
                <div>
                  <h3>최근 평가</h3>
                  <div className="sub">추천이 이상하면 평가를 수정해보세요.</div>
                </div>
                <button className="tab">전체 기록</button>
              </div>
              <div className="history">
                {HISTORY.map((h) => (
                  <div key={h.title} className="history-row">
                    <div className="mini-cover" />
                    <b>{h.title}</b>
                    <span>{h.type}</span>
                    <span className="stars">★ {h.rating}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="taste-col">
            <div className="card taste-panel">
              <h3>추천에서 줄일 요소</h3>
              <div className="sub">관심 없음 피드백을 바탕으로 추정했어요.</div>
              <div className="tag-cloud">
                {AVOID_TAGS.map((tag) => (
                  <span key={tag.label} className={`tag${tag.avoid ? " avoid" : ""}`}>
                    {tag.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="card taste-panel">
              <h3>추천 제어</h3>
              {CONTROLS.map((c) => (
                <div key={c.label} className="toggle-row">
                  <div className={`toggle${c.on ? "" : " off"}`}>
                    <i />
                  </div>
                  <span>{c.label}</span>
                </div>
              ))}
            </div>
            <div className="card taste-panel">
              <div className="headrow" style={{ margin: 0 }}>
                <h3>최근 AI 찾기</h3>
                <span className="pill">기록 관리</span>
              </div>
              {AI_LOGS.map((log) => (
                <div key={log.title} className="ai-log">
                  <b>{log.title}</b>
                  <span>{log.note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <SiteFooter
        title="추천의 주도권은 사용자에게"
        subtitle="취향 신호를 확인하고, 제외하고, 언제든 초기화할 수 있습니다."
      />
    </>
  );
}
