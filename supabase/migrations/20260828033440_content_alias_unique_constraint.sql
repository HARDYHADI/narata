
alter table public.content_alias
  add constraint content_alias_content_id_alias_title_key unique (content_id, alias_title);
