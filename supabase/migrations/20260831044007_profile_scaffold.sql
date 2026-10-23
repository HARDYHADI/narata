create table public.profile (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now()
);

alter table public.profile enable row level security;

create policy "profile_select_all" on public.profile
  for select using (true);

create policy "profile_update_own" on public.profile
  for update using (auth.uid() = id);

grant select on public.profile to anon, authenticated;
grant update on public.profile to authenticated;
grant select, insert, update, delete on public.profile to service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profile (id, nickname)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nickname', 'user_' || substr(new.id::text, 1, 8))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
