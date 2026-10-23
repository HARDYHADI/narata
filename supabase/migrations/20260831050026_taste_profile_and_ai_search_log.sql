-- user_preference: per-user recommendation controls, fully private
create table public.user_preference (
  user_id uuid primary key references public.profile(id) on delete cascade,
  exclude_watched boolean not null default true,
  limit_franchise_repeats boolean not null default true,
  use_community_activity boolean not null default true,
  include_adult boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.user_preference enable row level security;

create policy "user_preference_select_own" on public.user_preference
  for select using (auth.uid() = user_id);

create policy "user_preference_insert_own" on public.user_preference
  for insert with check (auth.uid() = user_id);

create policy "user_preference_update_own" on public.user_preference
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_preference_delete_own" on public.user_preference
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.user_preference to authenticated;
grant all on public.user_preference to service_role;

-- ai_search_log: logs every AI search, user_id nullable for anonymous searches
create table public.ai_search_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profile(id) on delete set null,
  query_text text not null,
  result_count int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.ai_search_log enable row level security;

create policy "ai_search_log_select_own" on public.ai_search_log
  for select using (auth.uid() = user_id);

create policy "ai_search_log_insert_own_or_anon" on public.ai_search_log
  for insert with check (user_id is null or auth.uid() = user_id);

grant insert on public.ai_search_log to anon, authenticated;
grant select on public.ai_search_log to authenticated;
grant all on public.ai_search_log to service_role;

-- ai_search_result_feedback: per-result relevance feedback, requires login
create table public.ai_search_result_feedback (
  search_log_id uuid not null references public.ai_search_log(id) on delete cascade,
  content_id uuid not null references public.content(id) on delete cascade,
  feedback text not null check (feedback in ('RELEVANT','NOT_RELEVANT')),
  created_at timestamptz not null default now(),
  primary key (search_log_id, content_id)
);

alter table public.ai_search_result_feedback enable row level security;

create policy "ai_search_result_feedback_select_own" on public.ai_search_result_feedback
  for select using (
    exists (
      select 1 from public.ai_search_log l
      where l.id = ai_search_result_feedback.search_log_id
        and l.user_id = auth.uid()
    )
  );

create policy "ai_search_result_feedback_insert_own" on public.ai_search_result_feedback
  for insert with check (
    exists (
      select 1 from public.ai_search_log l
      where l.id = ai_search_result_feedback.search_log_id
        and l.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.ai_search_result_feedback to authenticated;
grant all on public.ai_search_result_feedback to service_role;
