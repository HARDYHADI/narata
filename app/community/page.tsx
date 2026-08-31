import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import FeedBoard from "@/components/community/feed-board";
import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchCommunityFeed, fetchTrendingGalleries } from "@/lib/community/queries";

export const revalidate = 0;

export default async function CommunityPage() {
  const supabase = getSupabaseClient();
  const [posts, trending] = supabase
    ? await Promise.all([fetchCommunityFeed(supabase, "comments"), fetchTrendingGalleries(supabase, 5)])
    : [[], []];

  return (
    <>
      <SiteHeader active="community" searchPlaceholder="갤러리·게시글 검색" actions={<button className="btn">로그인</button>} />

      <div className="wrap">
        <div className="page-title">
          <div>
            <span className="eyebrow">NARATA COMMUNITY</span>
            <h1>이야기 광장</h1>
            <p>작품과 매체를 중심으로 빠르게 이야기하고, 필요한 정보는 구조적으로 모아요.</p>
          </div>
        </div>

        <div className="comm-layout">
          <div>
            <FeedBoard initialPosts={posts} />
          </div>

          <aside className="side">
            <div className="card sidebox">
              <h3>인기 갤러리</h3>
              {trending.length === 0 && <div className="muted">아직 데이터가 없어요.</div>}
              {trending.map((g, i) => (
                <div key={g.id} className="trend">
                  <b>{i + 1}</b>
                  <span>{g.name}</span>
                  <small>게시글 {g.post_count.toLocaleString()}</small>
                </div>
              ))}
            </div>
            <div className="card sidebox">
              <h3>커뮤니티 이용 안내</h3>
              <p className="sub">
                영화·드라마·OTT 오리지널 갤러리는 로그인 후 글쓰기가 가능해요. 애니·웹툰·웹소설 갤러리는
                닉네임 없이도 글을 쓸 수 있어요 (비밀번호 분실 시 복구 불가).
              </p>
              <p className="sub" style={{ marginTop: 10 }}>
                신고가 누적되면(10회) 자동으로 숨김 처리돼요.
              </p>
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
