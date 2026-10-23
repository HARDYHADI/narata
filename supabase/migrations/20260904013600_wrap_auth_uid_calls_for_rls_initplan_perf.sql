
-- Performance advisor flagged 48 RLS policies across 17 tables for calling
-- auth.uid() (or similar) directly, which Postgres re-evaluates per row
-- instead of once per query. Wrapping each call as `(select auth.uid())`
-- lets the planner treat it as a stable subquery evaluated once — same
-- semantics, no behavior change, standard Supabase-documented fix
-- (https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select).
-- Policies whose qual/with_check don't reference auth.uid() at all (e.g.
-- "true", "is_hidden = false") aren't touched.

alter policy ai_search_log_delete_own on ai_search_log
  using ((select auth.uid()) = user_id);
alter policy ai_search_log_insert_own_or_anon on ai_search_log
  with check ((user_id is null) or ((select auth.uid()) = user_id));
alter policy ai_search_log_select_own on ai_search_log
  using ((select auth.uid()) = user_id);

alter policy ai_search_result_feedback_insert_own on ai_search_result_feedback
  with check (exists (select 1 from ai_search_log l where (l.id = ai_search_result_feedback.search_log_id) and (l.user_id = (select auth.uid()))));
alter policy ai_search_result_feedback_select_own on ai_search_result_feedback
  using (exists (select 1 from ai_search_log l where (l.id = ai_search_result_feedback.search_log_id) and (l.user_id = (select auth.uid()))));

alter policy collection_delete_own on collection
  using ((select auth.uid()) = user_id);
alter policy collection_insert_own on collection
  with check ((select auth.uid()) = user_id);
alter policy collection_select_public_or_own on collection
  using ((is_public = true) or ((select auth.uid()) = user_id));
alter policy collection_update_own on collection
  using ((select auth.uid()) = user_id);

alter policy collection_item_delete_own on collection_item
  using (exists (select 1 from collection c where (c.id = collection_item.collection_id) and (c.user_id = (select auth.uid()))));
alter policy collection_item_insert_own on collection_item
  with check (exists (select 1 from collection c where (c.id = collection_item.collection_id) and (c.user_id = (select auth.uid()))));
alter policy collection_item_select_visible on collection_item
  using (exists (select 1 from collection c where (c.id = collection_item.collection_id) and (c.is_public or (c.user_id = (select auth.uid())))));
alter policy collection_item_update_own on collection_item
  using (exists (select 1 from collection c where (c.id = collection_item.collection_id) and (c.user_id = (select auth.uid()))));

alter policy "own delete comment" on comment
  using ((select auth.uid()) = user_id);
alter policy "insert comment" on comment
  with check (
    ((user_id is null) or (user_id = (select auth.uid())))
    and (
      ((post_id is not null) and (exists (select 1 from post p join gallery g on (g.id = p.gallery_id) where (p.id = comment.post_id) and (g.allow_anonymous_posts or ((select auth.uid()) is not null)))))
      or ((review_id is not null) and ((select auth.uid()) is not null))
    )
  );
alter policy "own update comment" on comment
  using ((select auth.uid()) = user_id);

alter policy "own delete content_rating" on content_rating
  using ((select auth.uid()) = user_id);
alter policy "own write content_rating" on content_rating
  with check ((select auth.uid()) = user_id);
alter policy "own update content_rating" on content_rating
  using ((select auth.uid()) = user_id);

alter policy "own write content_relation_feedback" on content_relation_feedback
  with check ((select auth.uid()) = user_id);
alter policy "own read content_relation_feedback" on content_relation_feedback
  using ((select auth.uid()) = user_id);

alter policy "own delete content_tag_vote" on content_tag_vote
  using ((select auth.uid()) = user_id);
alter policy "own write content_tag_vote" on content_tag_vote
  with check ((select auth.uid()) = user_id);
alter policy "own update content_tag_vote" on content_tag_vote
  using ((select auth.uid()) = user_id);

alter policy "own delete post" on post
  using ((select auth.uid()) = user_id);
alter policy "insert post" on post
  with check (
    ((user_id is null) or (user_id = (select auth.uid())))
    and (exists (select 1 from gallery g where (g.id = post.gallery_id) and (g.allow_anonymous_posts or ((select auth.uid()) is not null))))
  );
alter policy "own update post" on post
  using ((select auth.uid()) = user_id);

alter policy "own delete post_like" on post_like
  using ((select auth.uid()) = user_id);
alter policy "own insert post_like" on post_like
  with check ((select auth.uid()) = user_id);

alter policy profile_update_own on profile
  using ((select auth.uid()) = id);

alter policy "own insert report" on report
  with check ((select auth.uid()) = reporter_user_id);
alter policy "own read report" on report
  using ((select auth.uid()) = reporter_user_id);

alter policy "own delete review" on review
  using ((select auth.uid()) = user_id);
alter policy "own write review" on review
  with check ((select auth.uid()) = user_id);
alter policy "public read review" on review
  using ((is_hidden = false) or ((select auth.uid()) = user_id));
alter policy "own update review" on review
  using ((select auth.uid()) = user_id);

alter policy "own delete review_helpful" on review_helpful
  using ((select auth.uid()) = user_id);
alter policy "own write review_helpful" on review_helpful
  with check ((select auth.uid()) = user_id);

alter policy "own delete user_block" on user_block
  using ((select auth.uid()) = blocker_user_id);
alter policy "own insert user_block" on user_block
  with check ((select auth.uid()) = blocker_user_id);
alter policy "own read user_block" on user_block
  using ((select auth.uid()) = blocker_user_id);

alter policy user_preference_delete_own on user_preference
  using ((select auth.uid()) = user_id);
alter policy user_preference_insert_own on user_preference
  with check ((select auth.uid()) = user_id);
alter policy user_preference_select_own on user_preference
  using ((select auth.uid()) = user_id);
alter policy user_preference_update_own on user_preference
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter policy watchlist_item_delete_own on watchlist_item
  using ((select auth.uid()) = user_id);
alter policy watchlist_item_insert_own on watchlist_item
  with check ((select auth.uid()) = user_id);
alter policy watchlist_item_select_own on watchlist_item
  using ((select auth.uid()) = user_id);
