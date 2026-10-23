
-- These are trigger-only functions (RETURNS trigger) meant to run only via
-- their attached triggers, never called directly. Postgres already refuses
-- direct invocation of trigger functions, but they still carried the
-- default PUBLIC EXECUTE grant, which exposed them via PostgREST's
-- /rest/v1/rpc/<name> endpoint to anon/authenticated (flagged by Supabase's
-- security advisor). Revoking PUBLIC execute closes that exposure; it has
-- no effect on the triggers themselves, since trigger firing does not go
-- through the caller's execute privilege.
revoke execute on function public.apply_content_relation_auto_hide() from public;
revoke execute on function public.apply_report_auto_hide() from public;
revoke execute on function public.recompute_comment_counts() from public;
revoke execute on function public.recompute_content_rating_stats() from public;
revoke execute on function public.recompute_gallery_post_count() from public;
revoke execute on function public.recompute_post_like_count() from public;
revoke execute on function public.recompute_review_helpful_count() from public;
