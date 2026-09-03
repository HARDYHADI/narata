"use client";

import { useState } from "react";
import type { CommentItem } from "@/lib/community/queries";
import { formatAuthor, formatRelativeTime } from "@/lib/community/format";
import ReportButton from "./report-button";
import GuestCommentActions from "./guest-comment-actions";
import CommentReplyForm from "./comment-reply-form";

const INDENT_PER_DEPTH = 24;
const MAX_VISUAL_DEPTH = 4;

export default function CommentNode({
  comment,
  childrenByParent,
  depth,
  postId,
  loggedIn,
  allowAnonymousPosts,
  onChanged,
}: {
  comment: CommentItem;
  childrenByParent: Map<string, CommentItem[]>;
  depth: number;
  postId: string;
  loggedIn: boolean;
  allowAnonymousPosts: boolean;
  onChanged: () => void;
}) {
  const [replying, setReplying] = useState(false);
  const canReply = loggedIn || allowAnonymousPosts;
  const children = childrenByParent.get(comment.id) ?? [];

  return (
    <article
      className="review-item"
      style={{ marginLeft: Math.min(depth, MAX_VISUAL_DEPTH) * INDENT_PER_DEPTH }}
    >
      <div className="review-head">
        <b>{formatAuthor(comment.profile?.nickname, comment.guest_nickname, comment.ip_hash)}</b>
        <span className="sub">{formatRelativeTime(comment.created_at)}</span>
      </div>
      <p>{comment.body}</p>
      <div className="reaction">
        {canReply && (
          <span style={{ cursor: "pointer" }} onClick={() => setReplying((v) => !v)}>
            {replying ? "답글 취소" : "답글"}
          </span>
        )}
        <ReportButton targetType="COMMENT" targetId={comment.id} />
      </div>
      {comment.user_id === null && (
        <GuestCommentActions commentId={comment.id} currentBody={comment.body} onChanged={onChanged} />
      )}
      {replying && (
        <CommentReplyForm
          postId={postId}
          parentCommentId={comment.id}
          loggedIn={loggedIn}
          allowAnonymousPosts={allowAnonymousPosts}
          onCancel={() => setReplying(false)}
          onSubmitted={() => {
            setReplying(false);
            onChanged();
          }}
        />
      )}
      {children.map((child) => (
        <CommentNode
          key={child.id}
          comment={child}
          childrenByParent={childrenByParent}
          depth={depth + 1}
          postId={postId}
          loggedIn={loggedIn}
          allowAnonymousPosts={allowAnonymousPosts}
          onChanged={onChanged}
        />
      ))}
    </article>
  );
}
