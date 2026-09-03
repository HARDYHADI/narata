"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchGalleryPosts, type PostListItem, type PostSort } from "@/lib/community/queries";
import { formatAuthor } from "@/lib/community/format";

export default function PostBoard({
  galleryId,
  basePath,
  initialPosts,
  activeHead,
}: {
  galleryId: string;
  /** e.g. `/movies/${id}/gallery` — each row links to `${basePath}/${post.id}`. */
  basePath: string;
  initialPosts: PostListItem[];
  /** Current head filter (from ?head=), if any — carried into sort re-fetches. */
  activeHead?: string | null;
}) {
  const [sort, setSort] = useState<PostSort>("comments");
  const [posts, setPosts] = useState(initialPosts);
  const [loading, setLoading] = useState(false);

  async function handleSort(next: PostSort) {
    if (next === sort) return;
    setSort(next);
    setLoading(true);
    const supabase = getSupabaseClient();
    if (supabase) {
      const data = await fetchGalleryPosts(supabase, galleryId, next, 30, activeHead);
      setPosts(data);
    }
    setLoading(false);
  }

  return (
    <div className="board-card">
      <div className="board-tools">
        <span className="pill orange">실시간 인기</span>
        <div className="grow" />
        <button type="button" className={`tab${sort === "comments" ? " on" : ""}`} onClick={() => handleSort("comments")}>
          댓글순
        </button>
        <button type="button" className={`tab${sort === "latest" ? " on" : ""}`} onClick={() => handleSort("latest")}>
          최신순
        </button>
      </div>
      <div className="board-head">
        <span>번호</span>
        <span>말머리</span>
        <span>제목</span>
        <span>작성자</span>
        <span>조회</span>
        <span>추천</span>
      </div>
      {loading && (
        <div className="muted" style={{ padding: 22 }}>
          불러오는 중...
        </div>
      )}
      {!loading && posts.length === 0 && (
        <div className="muted" style={{ padding: 22 }}>
          아직 게시글이 없어요. 첫 글을 남겨보세요.
        </div>
      )}
      {!loading &&
        posts.map((post, i) => {
          const isHot = post.comment_count >= 50 || post.like_count >= 100;
          return (
            <Link
              key={post.id}
              href={`${basePath}/${post.id}`}
              className={`board-row${isHot ? " hot" : ""}${post.is_notice ? " notice" : ""}`}
            >
              <span className="num">{post.is_notice ? "공지" : posts.length - i}</span>
              <span className="head">{post.is_notice ? <b>{post.head}</b> : post.head}</span>
              <span className="title">
                {post.is_notice ? <b>{post.title}</b> : post.title}
                {post.contains_spoiler && <em className="comment"> [스포일러]</em>}
                {post.comment_count > 0 && <em className="comment"> [{post.comment_count}]</em>}
              </span>
              <span className="user">{formatAuthor(post.profile?.nickname, post.guest_nickname, post.ip_hash)}</span>
              <span className="views">{post.view_count.toLocaleString()}</span>
              <span className="likes">{post.like_count.toLocaleString()}</span>
            </Link>
          );
        })}
    </div>
  );
}
