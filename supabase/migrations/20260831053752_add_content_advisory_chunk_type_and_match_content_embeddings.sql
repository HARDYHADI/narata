-- Add CONTENT_ADVISORY to the embedding_document chunk_type allow-list,
-- keeping every previously allowed value.
alter table embedding_document drop constraint embedding_document_chunk_type_check;
alter table embedding_document add constraint embedding_document_chunk_type_check
  check (chunk_type = any (array[
    'WORK_SUMMARY','PLOT_FACT','CHARACTER','SETTING','EPISODE_SUMMARY',
    'RELATION','OFFICIAL_MEDIA','COMMUNITY_OPINION','CONTENT_ADVISORY'
  ]));

-- Per-movie similarity search, scoped to a single content_id (unlike
-- match_movie_embeddings, which searches across all content). Used by the
-- new per-movie AI Q&A endpoint.
create or replace function public.match_content_embeddings(
  query_embedding vector(1536),
  p_content_id uuid,
  match_count int default 6
)
returns table (id uuid, chunk_type text, chunk_text text, similarity float)
language sql stable
set search_path = public, extensions
as $$
  select id, chunk_type, chunk_text, 1 - (embedding <=> query_embedding) as similarity
  from embedding_document
  where content_id = p_content_id
  order by embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_content_embeddings(vector, uuid, int) to service_role, postgres, public;
