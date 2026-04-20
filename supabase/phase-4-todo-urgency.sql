-- Daydeck MVP schema update: todo urgency levels

alter table public.todos
add column if not exists urgency text not null default 'moderate';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'todos_urgency_check'
  ) then
    alter table public.todos
    add constraint todos_urgency_check
    check (urgency in ('urgent', 'moderate', 'not_urgent'));
  end if;
end;
$$;

-- Refresh PostgREST schema cache so the API sees the new column right away
notify pgrst, 'reload schema';
