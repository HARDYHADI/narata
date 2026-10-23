
create table public.watchlist_item (
  user_id uuid not null references public.profile(id) on delete cascade,
  content_id uuid not null references public.content(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, content_id)
);

create table public.collection (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  name text not null,
  description text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collection_item (
  collection_id uuid not null references public.collection(id) on delete cascade,
  content_id uuid not null references public.content(id) on delete cascade,
  note text,
  added_at timestamptz not null default now(),
  primary key (collection_id, content_id)
);

alter table public.watchlist_item enable row level security;
alter table public.collection enable row level security;
alter table public.collection_item enable row level security;

-- watchlist_item: fully private
create policy "watchlist_item_select_own" on public.watchlist_item
  for select using (auth.uid() = user_id);
create policy "watchlist_item_insert_own" on public.watchlist_item
  for insert with check (auth.uid() = user_id);
create policy "watchlist_item_delete_own" on public.watchlist_item
  for delete using (auth.uid() = user_id);

-- collection: public or own
create policy "collection_select_public_or_own" on public.collection
  for select using (is_public = true or auth.uid() = user_id);
create policy "collection_insert_own" on public.collection
  for insert with check (auth.uid() = user_id);
create policy "collection_update_own" on public.collection
  for update using (auth.uid() = user_id);
create policy "collection_delete_own" on public.collection
  for delete using (auth.uid() = user_id);

-- collection_item: follows parent collection visibility/ownership
create policy "collection_item_select_visible" on public.collection_item
  for select using (
    exists (
      select 1 from public.collection c
      where c.id = collection_item.collection_id
        and (c.is_public or c.user_id = auth.uid())
    )
  );
create policy "collection_item_insert_own" on public.collection_item
  for insert with check (
    exists (
      select 1 from public.collection c
      where c.id = collection_item.collection_id
        and c.user_id = auth.uid()
    )
  );
create policy "collection_item_update_own" on public.collection_item
  for update using (
    exists (
      select 1 from public.collection c
      where c.id = collection_item.collection_id
        and c.user_id = auth.uid()
    )
  );
create policy "collection_item_delete_own" on public.collection_item
  for delete using (
    exists (
      select 1 from public.collection c
      where c.id = collection_item.collection_id
        and c.user_id = auth.uid()
    )
  );

-- grants
grant select, insert, delete on public.watchlist_item to authenticated;
grant select, insert, update, delete on public.watchlist_item to service_role;

grant select on public.collection to anon, authenticated;
grant insert, update, delete on public.collection to authenticated;
grant select, insert, update, delete on public.collection to service_role;

grant select on public.collection_item to anon, authenticated;
grant insert, update, delete on public.collection_item to authenticated;
grant select, insert, update, delete on public.collection_item to service_role;
