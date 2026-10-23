
create or replace function public.match_movie_embeddings(
  query_embedding extensions.vector(1536),
  match_count int default 5
)
returns table (
  content_id uuid,
  chunk_text text,
  similarity double precision
)
language sql
stable
set search_path = public, extensions
as $$
  select
    ed.content_id,
    ed.chunk_text,
    1 - (ed.embedding <=> query_embedding) as similarity
  from public.embedding_document ed
  where ed.chunk_type = 'WORK_SUMMARY'
  order by ed.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_movie_embeddings(extensions.vector, int) to service_role;
