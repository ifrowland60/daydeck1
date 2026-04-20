-- Day events (title, description, time) per calendar day
--
-- If the app reports: "Could not find the table 'public.day_events' in the schema cache"
-- 1) Run this entire script in Supabase → SQL Editor
-- 2) The NOTIFY at the end refreshes PostgREST; if needed, run again:
--    notify pgrst, 'reload schema';

create table if not exists public.day_events (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.days(id) on delete cascade,
  title text not null default '',
  description text not null default '',
  event_time time null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists day_events_set_updated_at on public.day_events;
create trigger day_events_set_updated_at
before update on public.day_events
for each row execute procedure public.set_updated_at();

alter table public.day_events enable row level security;

drop policy if exists "day_events_select_own" on public.day_events;
create policy "day_events_select_own"
on public.day_events for select
using (
  exists (
    select 1 from public.days
    where days.id = day_events.day_id
      and days.user_id = auth.uid()
  )
);

drop policy if exists "day_events_insert_own" on public.day_events;
create policy "day_events_insert_own"
on public.day_events for insert
with check (
  exists (
    select 1 from public.days
    where days.id = day_events.day_id
      and days.user_id = auth.uid()
  )
);

drop policy if exists "day_events_update_own" on public.day_events;
create policy "day_events_update_own"
on public.day_events for update
using (
  exists (
    select 1 from public.days
    where days.id = day_events.day_id
      and days.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.days
    where days.id = day_events.day_id
      and days.user_id = auth.uid()
  )
);

drop policy if exists "day_events_delete_own" on public.day_events;
create policy "day_events_delete_own"
on public.day_events for delete
using (
  exists (
    select 1 from public.days
    where days.id = day_events.day_id
      and days.user_id = auth.uid()
  )
);

notify pgrst, 'reload schema';
