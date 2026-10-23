
-- Duplicate UNIQUE constraint on content_relation (same columns as
-- content_relation_unique_pair, just auto-named) — flagged by the
-- performance advisor. Neither is referenced by any FK, safe to drop one.
alter table content_relation drop constraint content_relation_source_content_id_target_content_id_relati_key;

-- Missing covering indexes on foreign-key columns, flagged by the
-- performance advisor. Cheap to add at current data volume; avoids
-- sequential scans on join/filter-by-FK queries as data grows.
create index if not exists idx_ai_search_log_user_id on ai_search_log (user_id);
create index if not exists idx_ai_search_result_feedback_content_id on ai_search_result_feedback (content_id);
create index if not exists idx_collection_user_id on collection (user_id);
create index if not exists idx_collection_item_content_id on collection_item (content_id);
create index if not exists idx_comment_parent_comment_id on comment (parent_comment_id);
create index if not exists idx_comment_user_id on comment (user_id);
create index if not exists idx_content_genre_genre_id on content_genre (genre_id);
create index if not exists idx_content_rating_user_id on content_rating (user_id);
create index if not exists idx_content_relation_feedback_user_id on content_relation_feedback (user_id);
create index if not exists idx_content_tag_vote_tag_id on content_tag_vote (tag_id);
create index if not exists idx_content_tag_vote_user_id on content_tag_vote (user_id);
create index if not exists idx_content_video_content_id on content_video (content_id);
create index if not exists idx_content_watch_provider_provider_id on content_watch_provider (provider_id);
create index if not exists idx_gallery_content_id on gallery (content_id);
create index if not exists idx_post_user_id on post (user_id);
create index if not exists idx_post_like_user_id on post_like (user_id);
create index if not exists idx_review_content_id on review (content_id);
create index if not exists idx_review_user_id on review (user_id);
create index if not exists idx_review_helpful_user_id on review_helpful (user_id);
create index if not exists idx_user_block_blocked_user_id on user_block (blocked_user_id);
create index if not exists idx_watchlist_item_content_id on watchlist_item (content_id);
