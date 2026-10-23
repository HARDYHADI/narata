
alter table public.content
  add column external_rating numeric(3,1),
  add column external_rating_count integer;

comment on column public.content.external_rating is 'Source API rating (e.g. TMDB vote_average, 0-10 scale). Distinct from average_rating, which is Narata''s own user-rating aggregate.';
comment on column public.content.external_rating_count is 'Source API rating vote count (e.g. TMDB vote_count).';
