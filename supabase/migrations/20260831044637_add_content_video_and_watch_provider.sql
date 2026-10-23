
create table public.watch_provider (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  logo_url text
);

create table public.content_watch_provider (
  content_id uuid not null references public.content(id) on delete cascade,
  provider_id uuid not null references public.watch_provider(id) on delete cascade,
  country_code text not null,
  type text not null check (type in ('STREAMING','RENT','BUY','THEATER')),
  url text,
  primary key (content_id, provider_id, country_code, type)
);

create table public.content_video (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content(id) on delete cascade,
  video_type text not null check (video_type in ('TRAILER','TEASER','INTERVIEW','OST','CLIP')),
  title text not null,
  url text not null,
  provider_label text,
  duration_seconds int,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.watch_provider enable row level security;
alter table public.content_watch_provider enable row level security;
alter table public.content_video enable row level security;

create policy "public read watch_provider" on public.watch_provider for select using (true);
create policy "public read content_watch_provider" on public.content_watch_provider for select using (true);
create policy "public read content_video" on public.content_video for select using (true);

grant select on public.watch_provider to anon, authenticated;
grant select on public.content_watch_provider to anon, authenticated;
grant select on public.content_video to anon, authenticated;

grant all on public.watch_provider to service_role;
grant all on public.content_watch_provider to service_role;
grant all on public.content_video to service_role;
