"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchCommunityFeed, type FeedPostItem, type PostSort } from "@/lib/community/queries";
import { formatAuthor } from "@/lib/community/format";

// All content in this app currently lives under /movies — once other
// content types (WEBTOON, ANIME, ...) get their own detail pages, this
// should branch on content_type instead of always assuming /movies.
function postHref(post: FeedPostItem): string | null {
  const contentId = post.gallery?.content?.id;
  if (!contentId) return null;
  return `/movies/${contentId}/gallery/${post.id}`;
}

export default function FeedBoard({ initialPosts }: { initialPosts: FeedPostItem[] }) {
  const [sort, setSort] = useState<PostSort>("comments");
  const [posts, setPosts] = useState(initialPosts);
  const [loading, setLoading] = useState(false);

  async function handleSort(next: PostSort) {
    if (next === sort) return;
    setSort(next);
    setLoading(true);
    const supabase = getSupabaseClient();
    if (supabase) {
      const data = await fetchCommunityFeed(supabase, next);
      setPosts(data);
    }
    setLoading(false);
  }

  return (
    <div className="board-card">
      <div className="board-tools">
        <span className="pill dark">실시간 베스트</span>
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
          아직 게시글이 없어요.
        </div>
      )}
      {!loading &&
        posts.map((post, i) => {
          const href = postHref(post);
          const isHot = post.comment_count >= 50 || post.like_count >= 100;
          const galleryTag = post.gallery?.content?.canonical_title ?? post.gallery?.name ?? "";
          const rowClass = `board-row${isHot ? " hot" : ""}${post.is_notice ? " notice" : ""}`;
          const inner = (
            <>
              <span className="num">{post.is_notice ? "공지" : posts.length - i}</span>
              <span className="head">{post.is_notice ? <b>{post.head}</b> : post.head}</span>
              <span className="title">
                <span className="pill" style={{ marginRight: 6, fontSize: 11 }}>
                  {galleryTag}
                </span>
                {post.is_notice ? <b>{post.title}</b> : post.title}
                {post.comment_count > 0 && <em className="comment"> [{post.comment_count}]</em>}
              </span>
              <span className="user">{formatAuthor(post.profile?.nickname, post.guest_nickname, post.ip_hash)}</span>
              <span className="views">{post.view_count.toLocaleString()}</span>
              <span className="likes">{post.like_count.toLocaleString()}</span>
            </>
          );

          return href ? (
            <Link key={post.id} href={href} className={rowClass}>
              {inner}
            </Link>
          ) : (
            <div key={post.id} className={rowClass}>
              {inner}
            </div>
          );
        })}
    </div>
  );
}
