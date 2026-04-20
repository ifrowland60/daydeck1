-- Daydeck MVP schema + RLS policies (Phase 3)

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.days(id) on delete cascade,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.days(id) on delete cascade,
  content text not null,
  is_complete boolean not null default false,
  urgency text not null default 'moderate',
  source_type text not null default 'native',
  carried_from_todo_id uuid null references public.todos(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint todos_source_type_check check (source_type in ('native', 'carried')),
  constraint todos_urgency_check check (urgency in ('urgent', 'moderate', 'not_urgent'))
);

create table if not exists public.day_events (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.days(id) on delete cascade,
  title text not null default '',
  description text not null default '',
  event_time time null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists days_set_updated_at on public.days;
create trigger days_set_updated_at
before update on public.days
for each row execute procedure public.set_updated_at();

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
before update on public.notes
for each row execute procedure public.set_updated_at();

drop trigger if exists todos_set_updated_at on public.todos;
create trigger todos_set_updated_at
before update on public.todos
for each row execute procedure public.set_updated_at();

drop trigger if exists day_events_set_updated_at on public.day_events;
create trigger day_events_set_updated_at
before update on public.day_events
for each row execute procedure public.set_updated_at();

alter table public.days enable row level security;
alter table public.notes enable row level security;
alter table public.todos enable row level security;
alter table public.day_events enable row level security;

drop policy if exists "days_select_own" on public.days;
create policy "days_select_own"
on public.days for select
using (auth.uid() = user_id);

drop policy if exists "days_insert_own" on public.days;
create policy "days_insert_own"
on public.days for insert
with check (auth.uid() = user_id);

drop policy if exists "days_update_own" on public.days;
create policy "days_update_own"
on public.days for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "days_delete_own" on public.days;
create policy "days_delete_own"
on public.days for delete
using (auth.uid() = user_id);

drop policy if exists "notes_select_own" on public.notes;
create policy "notes_select_own"
on public.notes for select
using (
  exists (
    select 1 from public.days
    where days.id = notes.day_id
      and days.user_id = auth.uid()
  )
);

drop policy if exists "notes_insert_own" on public.notes;
create policy "notes_insert_own"
on public.notes for insert
with check (
  exists (
    select 1 from public.days
    where days.id = notes.day_id
      and days.user_id = auth.uid()
  )
);

drop policy if exists "notes_update_own" on public.notes;
create policy "notes_update_own"
on public.notes for update
using (
  exists (
    select 1 from public.days
    where days.id = notes.day_id
      and days.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.days
    where days.id = notes.day_id
      and days.user_id = auth.uid()
  )
);

drop policy if exists "notes_delete_own" on public.notes;
create policy "notes_delete_own"
on public.notes for delete
using (
  exists (
    select 1 from public.days
    where days.id = notes.day_id
      and days.user_id = auth.uid()
  )
);

drop policy if exists "todos_select_own" on public.todos;
create policy "todos_select_own"
on public.todos for select
using (
  exists (
    select 1 from public.days
    where days.id = todos.day_id
      and days.user_id = auth.uid()
  )
);

drop policy if exists "todos_insert_own" on public.todos;
create policy "todos_insert_own"
on public.todos for insert
with check (
  exists (
    select 1 from public.days
    where days.id = todos.day_id
      and days.user_id = auth.uid()
  )
);

drop policy if exists "todos_update_own" on public.todos;
create policy "todos_update_own"
on public.todos for update
using (
  exists (
    select 1 from public.days
    where days.id = todos.day_id
      and days.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.days
    where days.id = todos.day_id
      and days.user_id = auth.uid()
  )
);

drop policy if exists "todos_delete_own" on public.todos;
create policy "todos_delete_own"
on public.todos for delete
using (
  exists (
    select 1 from public.days
    where days.id = todos.day_id
      and days.user_id = auth.uid()
  )
);

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
