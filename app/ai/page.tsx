import SiteHeader from "@/components/site-header";

const RESULTS = [
  {
    tone: "",
    tag: "FANTASY · 2004",
    title: "페인티드 월드",
    confidence: "일치 가능성 86%",
    match: "그림 속 왕국, 말하는 까마귀, 물에 번지는 세계",
    mismatch: "국내 TV 방영 기록 불확실",
    actions: ["이 작품 맞아요", "아니에요"],
  },
  {
    tone: "tone-2",
    tag: "ADVENTURE · 1999",
    title: "잉크의 문",
    confidence: "일치 가능성 62%",
    match: "그림을 통과하는 주인공, 새 조력자",
    mismatch: "물과 관련된 결말 없음",
    actions: ["비슷해요", "아니에요"],
  },
  {
    tone: "tone-3",
    tag: "TV MOVIE · 2002",
    title: "푸른 액자",
    confidence: "일치 가능성 41%",
    match: "TV 영화, 어두운 동화 분위기",
    mismatch: "주인공이 성인, 말하는 새 없음",
    actions: ["비슷해요", "아니에요"],
  },
];

const EXAMPLES = [
  { title: "장면으로 찾기", prompt: "기차 안에서 시간이 거꾸로 흐르는 영화였어" },
  { title: "취향 추천", prompt: "우울하지 않고 12화 안에 끝나는 성장 애니" },
  { title: "관계 묻기", prompt: "이 드라마 원작 웹툰과 결말이 달라?" },
];

export default function AiFindPage() {
  return (
    <>
      <SiteHeader
        active="ai"
        actions={
          <>
            <button className="btn ghost">이전 질문</button>
            <button className="btn">내 프로필</button>
          </>
        }
      />

      <div className="ai-shell wrap">
        <div className="ai-intro">
          <span className="pill orange">NARATA AI · 작품 찾기</span>
          <h1>기억나는 장면부터 말해보세요</h1>
          <p>
            제목, 배우, 연도를 몰라도 괜찮아요. 줄거리·캐릭터·분위기·본 시기 같은 단서를 조합해
            <br />
            근거와 확신도를 함께 보여드립니다.
          </p>
        </div>

        <div className="ai-card">
          <div className="chat">
            <div className="bubble user">
              어릴 때 본 외국 영화인데, 아이가 그림 속 세계로 들어가고 말하는 새가 길을 안내했어. 조금
              무서운 분위기였던 것 같아.
            </div>
            <div className="bubble ai">
              <b>기억을 좁혀볼게요.</b>
              <br />
              실사 영화와 애니메이션이 섞여 있었나요? 그리고 대략 언제쯤 보셨나요?
            </div>
            <div className="follow">
              <b>가장 가까운 단서를 골라주세요</b>
              <div className="choices">
                <button className="choice">2000년대 이전</button>
                <button className="choice on">2000~2010년</button>
                <button className="choice">2010년 이후</button>
                <button className="choice">실사+애니 혼합</button>
                <button className="choice">잘 모르겠어요</button>
              </div>
            </div>
            <div className="bubble user">
              2000년대 초반에 TV에서 봤고, 거의 실사였던 것 같아. 그림이 물에 젖으면 세계도 무너졌어.
            </div>
            <div className="bubble ai">
              <b>세 작품을 찾았어요.</b>
              <br />
              ‘그림 속 세계’, ‘말하는 조력자’, ‘세계가 물에 의해 붕괴’ 단서를 우선 반영했습니다. 첫
              번째 후보의 일치도가 가장 높아요.
            </div>

            <div className="results">
              {RESULTS.map((r) => (
                <article key={r.title} className="result">
                  <div className={`thumb ${r.tone}`}>
                    <small>{r.tag}</small>
                    <b>{r.title}</b>
                  </div>
                  <div className="confidence">{r.confidence}</div>
                  <h3>{r.title}</h3>
                  <div className="reason">
                    <b>일치:</b> {r.match}
                    <br />
                    <b>차이:</b> {r.mismatch}
                  </div>
                  <div className="feedback">
                    {r.actions.map((a) => (
                      <button key={a}>{a}</button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="composer">
            <input defaultValue="추가로 기억나는 장면이나 틀린 단서를 알려주세요" />
            <button className="btn orange">보내기</button>
          </div>
          <div className="sub" style={{ marginTop: 12 }}>
            AI 답변은 작품 메타데이터와 허용된 요약 정보에 근거하며, 확실하지 않은 내용은 불확실성을
            표시합니다.
          </div>
        </div>

        <div className="examples">
          {EXAMPLES.map((ex) => (
            <div key={ex.title} className="example">
              <b>{ex.title}</b>
              <br />“{ex.prompt}”
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
