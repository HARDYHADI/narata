
-- Persist a resolved Wikidata QID per content row so future discovery runs
-- (and cross-references between two already-resolved rows) skip re-searching.
alter table content add column if not exists wikidata_qid text unique;

-- Grounded evidence quote for tier-2 (Wikipedia + LLM extraction) relations,
-- and a moderation flag mirroring the report/post/review/comment pattern.
alter table content_relation add column if not exists evidence_text text;
alter table content_relation add column if not exists is_hidden boolean not null default false;

alter table content_relation
  add constraint content_relation_unique_pair
  unique (source_content_id, target_content_id, relation_type);

-- content_relation already has RLS enabled with a public-read-everything
-- policy from the original schema (predating is_hidden) — tighten it to
-- respect the new column instead of leaving a stale "qual: true" policy.
drop policy if exists "public read content_relation" on content_relation;
create policy "public read content_relation" on content_relation
  for select
  using (is_hidden = false);

-- Community verification (Tier 4): logged-in users confirm/reject a
-- relation; existing SELECT/INSERT grants on content_relation and its
-- service_role write access are untouched above (this table already had
-- the correct grants applied, verified via role_table_grants).
create table content_relation_feedback (
  relation_id uuid not null references content_relation(id) on delete cascade,
  user_id uuid not null references profile(id) on delete cascade,
  feedback text not null check (feedback in ('CONFIRM','REJECT')),
  created_at timestamptz not null default now(),
  primary key (relation_id, user_id)
);

alter table content_relation_feedback enable row level security;

create policy "own read content_relation_feedback" on content_relation_feedback
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "own write content_relation_feedback" on content_relation_feedback
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- This project's migrations get no default grants to anon/authenticated/
-- service_role — every new table needs them explicit (see other tables'
-- "grant_content_domain_table_privileges"-style migrations).
grant select, insert on content_relation_feedback to authenticated;
grant select, insert, update, delete on content_relation_feedback to service_role;

-- Auto-hide trigger, mirroring apply_report_auto_hide()'s threshold-based,
-- no-manual-review-queue approach. Report auto-hide uses a threshold of 10;
-- relation feedback is a much lower-traffic surface (a handful of viewers
-- per relation, not a whole reports queue), so this uses 5 as specified.
create or replace function apply_content_relation_auto_hide()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_threshold constant int := 5;
  v_count int;
begin
  if new.feedback = 'REJECT' then
    select count(*) into v_count from content_relation_feedback
      where relation_id = new.relation_id and feedback = 'REJECT';

    if v_count >= v_threshold then
      update content_relation set is_hidden = true where id = new.relation_id;
    end if;
  end if;
  return new;
end;
$function$;

create trigger trg_content_relation_auto_hide
  after insert on content_relation_feedback
  for each row
  execute function apply_content_relation_auto_hide();
