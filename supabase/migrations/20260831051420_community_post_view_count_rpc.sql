
create or replace function public.increment_post_view_count(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update post set view_count = view_count + 1 where id = p_post_id and is_hidden = false;
end;
$$;

grant execute on function public.increment_post_view_count(uuid) to anon, authenticated;
