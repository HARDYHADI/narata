create table rate_limit_event (
  id uuid primary key default gen_random_uuid(),
  bucket_key text not null,
  route text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_event_lookup_idx on rate_limit_event (bucket_key, route, created_at desc);

alter table rate_limit_event enable row level security;
-- Purely an internal cost-control mechanism driven by the service-role
-- admin client from API routes — no client (anon/authenticated) reads or
-- writes this table directly.
grant select, insert, delete on rate_limit_event to service_role;
