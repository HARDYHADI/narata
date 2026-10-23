-- Both SECURITY DEFINER RPCs were callable by anon/authenticated through
-- /rest/v1/rpc/<name> (flagged by the security advisor): anyone could inflate
-- post view counts or create gallery rows without going through the app.
-- The app now calls them only from server components with the service-role
-- client, so restrict execute to service_role. service_role previously had
-- execute only via the PUBLIC grant, hence the explicit grant.
revoke execute on function public.get_or_create_content_gallery(uuid) from public, anon, authenticated;
revoke execute on function public.increment_post_view_count(uuid) from public, anon, authenticated;

grant execute on function public.get_or_create_content_gallery(uuid) to service_role;
grant execute on function public.increment_post_view_count(uuid) to service_role;
