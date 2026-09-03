import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import LikeButton from "@/components/community/like-button";
import ReportButton from "@/components/community/report-button";
import GuestPostActions from "@/components/community/guest-post-actions";
import CommentSection from "@/components/community/comment-section";
import AuthStatus from "@/components/auth-status";
import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchMovieDetail } from "@/lib/movies/queries";
import { fetchPost, fetchGallery, fetchPostComments, recordPostView } from "@/lib/community/queries";
import { formatAuthor, formatRelativeTime } from "@/lib/community/format";

export const revalidate = 0;

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string; postId: string }>;
}) {
  const { id, postId } = await params;
  const supabase = getSupabaseClient();
  if (!supabase) notFound();

  const movie = await fetchMovieDetail(supabase, id);
  if (!movie) notFound();

  const post = await fetchPost(supabase, postId);
  if (!post) notFound();

  const [gallery, comments] = await Promise.all([
    fetchGallery(supabase, post.gallery_id),
    fetchPostComments(supabase, postId),
  ]);

  // Fire-and-forget: don't block rendering on the view-count RPC.
  void recordPostView(supabase, postId);

  const basePath = `/movies/${id}/gallery`;

  return (
    <>
      <SiteHeader active="content" actions={<AuthStatus />} />
      <div className="moviebar">
        <div className="wrap moviebar-row">
          <b>{movie.canonical_title} 갤러리</b>
        </div>
      </div>

      <div className="wrap">
        <nav className="detail-tabs">
          <Link href={basePath}>갤러리로</Link>
        </nav>

        <div className="card review-item" style={{ marginTop: 16 }}>
          <div className="review-head">
            <div>
              <span className="pill" style={{ marginRight: 8 }}>
                {post.head}
              </span>
              <b style={{ fontSize: 19 }}>{post.title}</b>
            </div>
            <span className="sub">{formatRelativeTime(post.created_at)}</span>
          </div>
          <div className="sub" style={{ marginTop: 6 }}>
            {formatAuthor(post.profile?.nickname, post.guest_nickname, post.ip_hash)} · 조회{" "}
            {(post.view_count + 1).toLocaleString()}
          </div>
          <p style={{ whiteSpace: "pre-wrap", marginTop: 16 }}>
            {post.contains_spoiler && (
              <span className="pill orange" style={{ marginRight: 8 }}>
                스포일러 포함
              </span>
            )}
            {post.body}
          </p>
          <div className="reaction" style={{ marginTop: 16, alignItems: "center", gap: 16 }}>
            <LikeButton postId={post.id} initialLikeCount={post.like_count} />
            <ReportButton targetType="POST" targetId={post.id} />
          </div>
          {post.user_id === null && (
            <GuestPostActions
              postId={post.id}
              currentTitle={post.title}
              currentBody={post.body}
              currentSpoiler={post.contains_spoiler}
              basePath={basePath}
            />
          )}
        </div>

        <div style={{ marginTop: 16, marginBottom: 60 }}>
          <CommentSection
            postId={post.id}
            allowAnonymousPosts={gallery?.allow_anonymous_posts ?? false}
            initialComments={comments}
          />
        </div>
      </div>

      <SiteFooter
        title="작품에서 시작하는 대화"
        subtitle="평점, 갤러리, 관계작을 한 화면에서 확인하세요."
      />
    </>
  );
}
