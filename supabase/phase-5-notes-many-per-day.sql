-- Allow multiple notes per day (remove one-note-per-day constraint).
-- Run this in Supabase → SQL Editor if you see:
--   duplicate key value violates unique constraint "notes_day_id_key"

-- Drop the legacy unique-on-day_id constraint by any name Postgres gave it.
alter table public.notes drop constraint if exists notes_day_id_key;

-- Also drop any other UNIQUE constraint that applies only to day_id (covers renames / odd DDL).
do $$
declare
  constraint_name text;
begin
  select c.conname
    into constraint_name
  from pg_constraint c
  where c.conrelid = 'public.notes'::regclass
    and c.contype = 'u'
    and cardinality(c.conkey) = 1
    and (
      select a.attname::text
      from pg_attribute a
      where a.attrelid = c.conrelid
        and a.attnum = c.conkey[1]
        and not a.attisdropped
    ) = 'day_id'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.notes drop constraint %I', constraint_name);
  end if;
end;
$$;

notify pgrst, 'reload schema';
