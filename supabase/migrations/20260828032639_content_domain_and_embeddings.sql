
-- Extensions
create extension if not exists vector with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- updated_at trigger helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- content: canonical work entity (movie/drama/anime/webtoon/novel/...)
create table public.content (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in (
    'MOVIE', 'DRAMA', 'ANIME', 'COMIC', 'WEBTOON', 'WEBNOVEL', 'OTT_ORIGINAL'
  )),
  canonical_title text not null,
  original_title text,
  synopsis_short text,
  synopsis_long text,
  release_date date,
  end_date date,
  status text not null default 'UNKNOWN' check (status in (
    'UPCOMING', 'ONGOING', 'COMPLETED', 'HIATUS', 'CANCELLED', 'UNKNOWN'
  )),
  country_code text,
  original_language text,
  runtime_minutes integer,
  episode_count integer,
  age_rating text,
  average_rating numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  popularity_score numeric not null default 0,
  community_activity_score numeric not null default 0,
  search_text tsvector generated always as (
    to_tsvector('simple', coalesce(canonical_title, '') || ' ' || coalesce(original_title, '') || ' ' || coalesce(synopsis_short, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index content_search_text_idx on public.content using gin (search_text);
create index content_type_idx on public.content (content_type);
create index content_title_trgm_idx on public.content using gin (canonical_title extensions.gin_trgm_ops);

create trigger content_set_updated_at
  before update on public.content
  for each row execute function public.set_updated_at();

-- content_alias: alternate titles for search/matching
create table public.content_alias (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content(id) on delete cascade,
  alias_title text not null,
  alias_type text not null default 'ALTERNATE' check (alias_type in (
    'TRANSLATED', 'FORMER', 'ABBREVIATION', 'ROMANIZED', 'ALTERNATE'
  )),
  created_at timestamptz not null default now()
);

create index content_alias_content_id_idx on public.content_alias (content_id);
create index content_alias_title_trgm_idx on public.content_alias using gin (alias_title extensions.gin_trgm_ops);

-- genre + join table
create table public.genre (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table public.content_genre (
  content_id uuid not null references public.content(id) on delete cascade,
  genre_id uuid not null references public.genre(id) on delete cascade,
  primary key (content_id, genre_id)
);

-- content_relation: adaptation/sequel/prequel graph
create table public.content_relation (
  id uuid primary key default gen_random_uuid(),
  source_content_id uuid not null references public.content(id) on delete cascade,
  target_content_id uuid not null references public.content(id) on delete cascade,
  relation_type text not null check (relation_type in (
    'ORIGINAL', 'ADAPTATION', 'SEQUEL', 'PREQUEL', 'SPINOFF', 'REMAKE', 'SAME_UNIVERSE'
  )),
  confidence numeric,
  source_id text,
  created_at timestamptz not null default now(),
  unique (source_content_id, target_content_id, relation_type)
);

create index content_relation_source_idx on public.content_relation (source_content_id);
create index content_relation_target_idx on public.content_relation (target_content_id);

-- external_identifier: mapping to source APIs (TMDB, KMDb, AniList, ...)
create table public.external_identifier (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content(id) on delete cascade,
  source text not null,
  external_id text not null,
  raw_payload jsonb,
  fetched_at timestamptz not null default now(),
  unique (source, external_id)
);

create index external_identifier_content_id_idx on public.external_identifier (content_id);

-- embedding_document: RAG chunks derived from content
create table public.embedding_document (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content(id) on delete cascade,
  chunk_type text not null check (chunk_type in (
    'WORK_SUMMARY', 'PLOT_FACT', 'CHARACTER', 'SETTING',
    'EPISODE_SUMMARY', 'RELATION', 'OFFICIAL_MEDIA', 'COMMUNITY_OPINION'
  )),
  chunk_text text not null,
  embedding extensions.vector(1536),
  embedding_model text,
  embedding_version text,
  source_id text,
  source_record_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index embedding_document_content_id_idx on public.embedding_document (content_id);
create index embedding_document_chunk_type_idx on public.embedding_document (chunk_type);
create index embedding_document_embedding_hnsw_idx
  on public.embedding_document using hnsw (embedding extensions.vector_cosine_ops);

create trigger embedding_document_set_updated_at
  before update on public.embedding_document
  for each row execute function public.set_updated_at();

-- RLS: public read for content-facing tables, writes reserved for service_role
alter table public.content enable row level security;
alter table public.content_alias enable row level security;
alter table public.genre enable row level security;
alter table public.content_genre enable row level security;
alter table public.content_relation enable row level security;
alter table public.external_identifier enable row level security;
alter table public.embedding_document enable row level security;

create policy "public read content" on public.content for select using (true);
create policy "public read content_alias" on public.content_alias for select using (true);
create policy "public read genre" on public.genre for select using (true);
create policy "public read content_genre" on public.content_genre for select using (true);
create policy "public read content_relation" on public.content_relation for select using (true);

-- external_identifier and embedding_document carry raw API payloads / retrieval internals:
-- no public select policy, so only service_role (ingestion/AI backend) can read or write them.
