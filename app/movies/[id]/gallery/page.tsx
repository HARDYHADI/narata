import { notFound } from "next/navigation";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import PostBoard from "@/components/community/post-board";
import PostWriteBox from "@/components/community/post-write-box";
import AuthStatus from "@/components/auth-status";
import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchMovieDetail } from "@/lib/movies/queries";
import {
  getOrCreateContentGallery,
  fetchGallery,
  fetchGalleryPosts,
  fetchTrendingGalleries,
} from "@/lib/community/queries";
import { POST_HEADS } from "@/lib/community/format";

export const revalidate = 0;

export default async function MovieGalleryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = getSupabaseClient();
  if (!supabase) notFound();

  const movie = await fetchMovieDetail(supabase, id);
  if (!movie) notFound();

  const galleryId = await getOrCreateContentGallery(supabase, id);
  if (!galleryId) notFound();

  const [gallery, posts, trending] = await Promise.all([
    fetchGallery(supabase, galleryId),
    fetchGalleryPosts(supabase, galleryId, "comments"),
    fetchTrendingGalleries(supabase, 5),
  ]);

  const basePath = `/movies/${id}/gallery`;
  const selectableHeads = POST_HEADS.filter((h) => h !== "공지");

  return (
    <>
      <SiteHeader
        active="content"
        searchPlaceholder="갤러리 게시글 검색"
        actions={
          <>
            <a href="#write-box" className="btn orange">
              글쓰기
            </a>
            <AuthStatus />
          </>
        }
      />
      <div className="moviebar">
        <div className="wrap moviebar-row">
          <b>{movie.canonical_title} 갤러리</b>
        </div>
      </div>

      <div className="wrap">
        <div className="page-title">
          <div>
            <span className="eyebrow">{movie.content_type} GALLERY</span>
            <h1>{movie.canonical_title} 갤러리</h1>
            <p>
              게시글 {(gallery?.post_count ?? 0).toLocaleString()}개
              {!gallery?.allow_anonymous_posts && " · 이 갤러리는 로그인 후 글쓰기가 가능해요."}
            </p>
          </div>
        </div>

        <div className="comm-layout">
          <div>
            <div id="write-box">
              <PostWriteBox
                galleryId={galleryId}
                allowAnonymousPosts={gallery?.allow_anonymous_posts ?? false}
                basePath={basePath}
              />
            </div>
            <PostBoard galleryId={galleryId} basePath={basePath} initialPosts={posts} />
          </div>

          <aside className="side">
            <div className="card sidebox">
              <h3>갤러리 정보</h3>
              <div className="trend">
                <b>글</b>
                <span>{(gallery?.post_count ?? 0).toLocaleString()}개</span>
              </div>
            </div>
            <div className="card sidebox">
              <h3>말머리</h3>
              <div className="gallery">
                {selectableHeads.map((h) => (
                  <span key={h} className="pill">
                    {h}
                  </span>
                ))}
              </div>
            </div>
            <div className="card sidebox">
              <h3>인기 갤러리</h3>
              {trending.length === 0 && <div className="muted">아직 데이터가 없어요.</div>}
              {trending.map((g, i) => (
                <div key={g.id} className="trend">
                  <b>{i + 1}</b>
                  <span>{g.name}</span>
                  <small>{g.post_count.toLocaleString()}</small>
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
