-- Speed up day workspace + carry-forward lookups (safe to run once in SQL editor)

create index if not exists idx_days_user_id_date on public.days (user_id, date);

create index if not exists idx_todos_day_id_open_native on public.todos (day_id)
  where is_complete = false and source_type = 'native';
