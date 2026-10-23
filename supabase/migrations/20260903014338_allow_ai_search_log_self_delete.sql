create policy "ai_search_log_delete_own" on ai_search_log
  for delete using (auth.uid() = user_id);

grant delete on ai_search_log to authenticated;