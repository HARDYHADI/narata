
create table public.content_rating (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content(id) on delete cascade,
  user_id uuid not null references public.profile(id) on delete cascade,
  score numeric(2,1) not null check (score >= 0.5 and score <= 5.0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_id, user_id)
);

create table public.review (
  id uuid primary key default gen_random_uuid(),
  content_rating_id uuid not null unique references public.content_rating(id) on delete cascade,
  content_id uuid not null references public.content(id) on delete cascade,
  user_id uuid not null references public.profile(id) on delete cascade,
  body text not null,
  contains_spoiler boolean not null default false,
  helpful_count int not null default 0,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.review_helpful (
  review_id uuid not null references public.review(id) on delete cascade,
  user_id uuid not null references public.profile(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);

create table public.content_tag (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null check (category in ('MOOD','CONTENT_ADVISORY')),
  kind text not null default 'NEUTRAL' check (kind in ('POSITIVE','NEGATIVE','NEUTRAL'))
);

create table public.content_tag_vote (
  content_id uuid not null references public.content(id) on delete cascade,
  tag_id uuid not null references public.content_tag(id) on delete cascade,
  user_id uuid not null references public.profile(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (content_id, tag_id, user_id)
);

alter table public.content_rating enable row level security;
alter table public.review enable row level security;
alter table public.review_helpful enable row level security;
alter table public.content_tag enable row level security;
alter table public.content_tag_vote enable row level security;

create policy "public read content_rating" on public.content_rating for select using (true);
create policy "own write content_rating" on public.content_rating for insert with check (auth.uid() = user_id);
create policy "own update content_rating" on public.content_rating for update using (auth.uid() = user_id);
create policy "own delete content_rating" on public.content_rating for delete using (auth.uid() = user_id);

create policy "public read review" on public.review for select using (is_hidden = false or auth.uid() = user_id);
create policy "own write review" on public.review for insert with check (auth.uid() = user_id);
create policy "own update review" on public.review for update using (auth.uid() = user_id);
create policy "own delete review" on public.review for delete using (auth.uid() = user_id);

create policy "public read review_helpful" on public.review_helpful for select using (true);
create policy "own write review_helpful" on public.review_helpful for insert with check (auth.uid() = user_id);
create policy "own delete review_helpful" on public.review_helpful for delete using (auth.uid() = user_id);

create policy "public read content_tag" on public.content_tag for select using (true);

create policy "public read content_tag_vote" on public.content_tag_vote for select using (true);
create policy "own write content_tag_vote" on public.content_tag_vote for insert with check (auth.uid() = user_id);
create policy "own update content_tag_vote" on public.content_tag_vote for update using (auth.uid() = user_id);
create policy "own delete content_tag_vote" on public.content_tag_vote for delete using (auth.uid() = user_id);

grant select on public.content_rating to anon, authenticated;
grant insert, update, delete on public.content_rating to authenticated;
grant all on public.content_rating to service_role;

grant select on public.review to anon, authenticated;
grant insert, update, delete on public.review to authenticated;
grant all on public.review to service_role;

grant select on public.review_helpful to anon, authenticated;
grant insert, delete on public.review_helpful to authenticated;
grant all on public.review_helpful to service_role;

grant select on public.content_tag to anon, authenticated;
grant all on public.content_tag to service_role;

grant select on public.content_tag_vote to anon, authenticated;
grant insert, update, delete on public.content_tag_vote to authenticated;
grant all on public.content_tag_vote to service_role;

create or replace function public.recompute_content_rating_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_content_id uuid;
begin
  target_content_id := coalesce(new.content_id, old.content_id);

  update public.content
  set
    average_rating = coalesce((select round(avg(score), 2) from public.content_rating where content_id = target_content_id), 0),
    rating_count = (select count(*) from public.content_rating where content_id = target_content_id)
  where id = target_content_id;

  return coalesce(new, old);
end;
$$;

create trigger trg_content_rating_stats
after insert or update or delete on public.content_rating
for each row execute function public.recompute_content_rating_stats();

create or replace function public.recompute_review_helpful_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_review_id uuid;
begin
  target_review_id := coalesce(new.review_id, old.review_id);

  update public.review
  set helpful_count = (select count(*) from public.review_helpful where review_id = target_review_id)
  where id = target_review_id;

  return coalesce(new, old);
end;
$$;

create trigger trg_review_helpful_count
after insert or delete on public.review_helpful
for each row execute function public.recompute_review_helpful_count();

insert into public.content_tag (name, category, kind) values
  ('여운이 길어요', 'MOOD', 'POSITIVE'),
  ('촬영이 아름다워요', 'MOOD', 'POSITIVE'),
  ('음향이 인상적이에요', 'MOOD', 'POSITIVE'),
  ('두 번 보고 싶어요', 'MOOD', 'POSITIVE'),
  ('전개가 느려요', 'MOOD', 'NEGATIVE'),
  ('해석이 필요해요', 'MOOD', 'NEGATIVE'),
  ('잔인한 장면 있음', 'CONTENT_ADVISORY', 'NEUTRAL'),
  ('폭력성 높음', 'CONTENT_ADVISORY', 'NEUTRAL'),
  ('선정적 장면 있음', 'CONTENT_ADVISORY', 'NEUTRAL'),
  ('공포·긴장감 있음', 'CONTENT_ADVISORY', 'NEUTRAL'),
  ('가족과 보기 좋음', 'CONTENT_ADVISORY', 'NEUTRAL'),
  ('스포일러성 반전 있음', 'CONTENT_ADVISORY', 'NEUTRAL'),
  ('동물 위해 묘사 있음', 'CONTENT_ADVISORY', 'NEUTRAL'),
  ('약물·음주 묘사 있음', 'CONTENT_ADVISORY', 'NEUTRAL');
