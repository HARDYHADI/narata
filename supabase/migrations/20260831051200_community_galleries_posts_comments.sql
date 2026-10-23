
-- review.comment_count (assumed by comment-count trigger below)
alter table public.review add column if not exists comment_count int not null default 0;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.gallery (
  id uuid primary key default gen_random_uuid(),
  content_id uuid references public.content(id) on delete cascade,
  slug text not null unique,
  name text not null,
  description text,
  allow_anonymous_posts boolean not null default false,
  post_count int not null default 0,
  member_count int not null default 0,
  created_at timestamptz not null default now()
);

create table public.post (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.gallery(id) on delete cascade,
  user_id uuid references public.profile(id) on delete set null,
  ip_hash text,
  guest_nickname text,
  guest_password_hash text,
  head text not null check (head in ('공지','분석','감상','질문','정보','창작','재미','추천')),
  title text not null,
  body text not null,
  is_notice boolean not null default false,
  contains_spoiler boolean not null default false,
  is_hidden boolean not null default false,
  view_count int not null default 0,
  like_count int not null default 0,
  comment_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or guest_password_hash is not null)
);

create table public.post_like (
  post_id uuid not null references public.post(id) on delete cascade,
  user_id uuid not null references public.profile(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.comment (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profile(id) on delete set null,
  ip_hash text,
  guest_nickname text,
  guest_password_hash text,
  post_id uuid references public.post(id) on delete cascade,
  review_id uuid references public.review(id) on delete cascade,
  parent_comment_id uuid references public.comment(id) on delete cascade,
  body text not null,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  check ((post_id is not null) <> (review_id is not null)),
  check (user_id is not null or guest_password_hash is not null)
);

create table public.report (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references public.profile(id) on delete cascade,
  target_type text not null check (target_type in ('POST','COMMENT','REVIEW')),
  target_id uuid not null,
  reason text,
  created_at timestamptz not null default now(),
  unique (reporter_user_id, target_type, target_id)
);

create table public.user_block (
  blocker_user_id uuid not null references public.profile(id) on delete cascade,
  blocked_user_id uuid not null references public.profile(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_user_id, blocked_user_id),
  check (blocker_user_id <> blocked_user_id)
);

create index post_gallery_id_idx on public.post(gallery_id);
create index post_created_at_idx on public.post(created_at desc);
create index comment_post_id_idx on public.comment(post_id);
create index comment_review_id_idx on public.comment(review_id);
create index report_target_idx on public.report(target_type, target_id);

-- ---------------------------------------------------------------------------
-- Lazy gallery creation RPC
-- ---------------------------------------------------------------------------

create or replace function public.get_or_create_content_gallery(p_content_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gallery_id uuid;
  v_content_type text;
  v_title text;
begin
  select id into v_gallery_id from gallery where content_id = p_content_id;
  if v_gallery_id is not null then
    return v_gallery_id;
  end if;

  select content_type, canonical_title into v_content_type, v_title from content where id = p_content_id;
  if v_content_type is null then
    raise exception 'content not found';
  end if;

  insert into gallery (content_id, slug, name, allow_anonymous_posts)
  values (
    p_content_id,
    p_content_id::text,
    v_title || ' 갤러리',
    v_content_type in ('ANIME','COMIC','WEBTOON','WEBNOVEL')
  )
  returning id into v_gallery_id;

  return v_gallery_id;
end;
$$;

grant execute on function public.get_or_create_content_gallery(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Report auto-hide trigger (threshold 10)
-- ---------------------------------------------------------------------------

create or replace function public.apply_report_auto_hide()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_threshold constant int := 10;
  v_count int;
begin
  select count(*) into v_count from report
    where target_type = new.target_type and target_id = new.target_id;

  if v_count >= v_threshold then
    if new.target_type = 'POST' then
      update post set is_hidden = true where id = new.target_id;
    elsif new.target_type = 'COMMENT' then
      update comment set is_hidden = true where id = new.target_id;
    elsif new.target_type = 'REVIEW' then
      update review set is_hidden = true where id = new.target_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_report_auto_hide
after insert on report
for each row execute function public.apply_report_auto_hide();

-- ---------------------------------------------------------------------------
-- Counter-maintenance triggers (same recompute pattern as
-- recompute_content_rating_stats used for content.average_rating)
-- ---------------------------------------------------------------------------

create or replace function public.recompute_gallery_post_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_gallery_id uuid;
begin
  target_gallery_id := coalesce(new.gallery_id, old.gallery_id);
  update gallery
  set post_count = (select count(*) from post where gallery_id = target_gallery_id)
  where id = target_gallery_id;
  return coalesce(new, old);
end;
$$;

create trigger trg_gallery_post_count
after insert or delete on public.post
for each row execute function public.recompute_gallery_post_count();

create or replace function public.recompute_post_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_post_id uuid;
begin
  target_post_id := coalesce(new.post_id, old.post_id);
  update post
  set like_count = (select count(*) from post_like where post_id = target_post_id)
  where id = target_post_id;
  return coalesce(new, old);
end;
$$;

create trigger trg_post_like_count
after insert or delete on public.post_like
for each row execute function public.recompute_post_like_count();

create or replace function public.recompute_comment_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_post_id uuid;
  target_review_id uuid;
begin
  target_post_id := coalesce(new.post_id, old.post_id);
  target_review_id := coalesce(new.review_id, old.review_id);

  if target_post_id is not null then
    update post set comment_count = (select count(*) from comment where post_id = target_post_id) where id = target_post_id;
  end if;

  if target_review_id is not null then
    update review set comment_count = (select count(*) from comment where review_id = target_review_id) where id = target_review_id;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger trg_comment_counts
after insert or delete on public.comment
for each row execute function public.recompute_comment_counts();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.gallery enable row level security;
alter table public.post enable row level security;
alter table public.post_like enable row level security;
alter table public.comment enable row level security;
alter table public.report enable row level security;
alter table public.user_block enable row level security;

create policy "public read gallery" on public.gallery for select using (true);

create policy "public read post" on public.post for select using (is_hidden = false);
create policy "insert post" on public.post for insert with check (
  (user_id is null or user_id = auth.uid())
  and exists (
    select 1 from gallery g
    where g.id = post.gallery_id
      and (g.allow_anonymous_posts or auth.uid() is not null)
  )
);
create policy "own update post" on public.post for update using (auth.uid() = user_id);
create policy "own delete post" on public.post for delete using (auth.uid() = user_id);

create policy "public read post_like" on public.post_like for select using (true);
create policy "own insert post_like" on public.post_like for insert with check (auth.uid() = user_id);
create policy "own delete post_like" on public.post_like for delete using (auth.uid() = user_id);

create policy "public read comment" on public.comment for select using (is_hidden = false);
create policy "insert comment" on public.comment for insert with check (
  (user_id is null or user_id = auth.uid())
  and (
    (post_id is not null and exists (
      select 1 from post p join gallery g on g.id = p.gallery_id
      where p.id = comment.post_id and (g.allow_anonymous_posts or auth.uid() is not null)
    ))
    or (review_id is not null and auth.uid() is not null)
  )
);
create policy "own update comment" on public.comment for update using (auth.uid() = user_id);
create policy "own delete comment" on public.comment for delete using (auth.uid() = user_id);

create policy "own read report" on public.report for select using (auth.uid() = reporter_user_id);
create policy "own insert report" on public.report for insert with check (auth.uid() = reporter_user_id);

create policy "own read user_block" on public.user_block for select using (auth.uid() = blocker_user_id);
create policy "own insert user_block" on public.user_block for insert with check (auth.uid() = blocker_user_id);
create policy "own delete user_block" on public.user_block for delete using (auth.uid() = blocker_user_id);

-- ---------------------------------------------------------------------------
-- Grants (apply_migration gives no default grants to anon/authenticated/service_role)
-- ---------------------------------------------------------------------------

grant select on public.gallery to anon, authenticated;
grant select, insert, update, delete on public.gallery to service_role;

grant select, insert on public.post to anon, authenticated;
grant update, delete on public.post to authenticated;
grant select, insert, update, delete on public.post to service_role;

grant select on public.post_like to anon, authenticated;
grant insert, delete on public.post_like to authenticated;
grant select, insert, update, delete on public.post_like to service_role;

grant select, insert on public.comment to anon, authenticated;
grant update, delete on public.comment to authenticated;
grant select, insert, update, delete on public.comment to service_role;

grant select, insert, delete on public.report to authenticated;
grant select, insert, update, delete on public.report to service_role;

grant select, insert, delete on public.user_block to authenticated;
grant select, insert, update, delete on public.user_block to service_role;
