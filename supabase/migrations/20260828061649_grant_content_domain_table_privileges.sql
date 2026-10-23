
-- service_role bypasses RLS but still needs base table grants (this project's
-- default ACL for tables created by the postgres role withholds them).
grant select, insert, update, delete on
  public.content,
  public.content_alias,
  public.genre,
  public.content_genre,
  public.content_relation,
  public.external_identifier,
  public.embedding_document
to service_role;

-- anon/authenticated need SELECT to exercise the "public read" RLS policies
-- already defined on these tables. external_identifier and embedding_document
-- intentionally get no grant here (service_role-only, per the RLS design).
grant select on
  public.content,
  public.content_alias,
  public.genre,
  public.content_genre,
  public.content_relation
to anon, authenticated;
