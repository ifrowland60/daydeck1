# Daydeck — project context (for new chats)

Paste or `@`-reference this file when starting a new Cursor chat so the assistant has a concise picture of what exists and what was decided.

## What this app is

**Daydeck** is a day-centered planner: month calendar + a **selected day** workspace (events, tasks/todos with urgency, notes). Auth via Supabase; data in Postgres through Supabase RLS.

## Stack

- **Next.js 16** (App Router), React 19, TypeScript, Tailwind v4
- **Supabase**: auth + server client in `lib/db/supabase-server.ts` (and browser client)
- Main authenticated UI: **`/app`** (`app/app/page.tsx`)

## Repo / Git

- Git root is **`daydeck-app/`** (not the parent `daydeck/` folder).
- Remote example used: `origin` → GitHub `daydeck1` (user: `ifrowland60`); adjust if renamed.
- Local identity was set repo-only for commits; use `git config user.email` with a real or GitHub noreply address when you care about attribution.

## Database / migrations

SQL phases under **`supabase/`** (run in Supabase SQL editor / migrations as you prefer):

| File | Purpose (high level) |
|------|----------------------|
| `phase-3-schema.sql` | Core: `days`, `todos`, `notes`, RLS, etc. |
| `phase-4-todo-urgency.sql` | Todo `urgency`: `urgent` \| `moderate` \| `not_urgent` |
| `phase-5-notes-many-per-day.sql` | Multiple notes per day |
| `phase-6-day-events.sql` | `day_events` (title, description, `event_time`); includes schema reload hint for PostgREST |
| `phase-7-workspace-perf-indexes.sql` | Indexes for faster day workspace / carry-forward (`days(user_id, date)`, partial `todos`) |

**Types** for API/app: `types/daydeck.ts` (`Day`, `Note`, `DayEvent`, `Todo`, `TodoUrgencyCounts`, **`CalendarDayContentSummary`**, …).

**Calendar grid bounds** (month view, not always six weeks): `lib/daydeck/calendar-grid.ts` — **`getCalendarGridCellCount(year, month)`** (month 1–12). Matches **`getCalendarGridDateBounds`** in `lib/daydeck/days.ts` for **`GET /api/day-content`**.

## API routes (App Router)

- **`GET /api/day-content?year=&month=`** — Returns **`CalendarDayContentSummary`**: `todoUrgencyByDate`, **`eventCountByDate`**, **`noteCountByDate`** (each keyed by ISO date) for the **visible month grid** (variable rows, 7 columns). Implemented in `lib/daydeck/days.ts` as **`getCalendarDayContentSummaryForMonth`** (single `days` query with nested `todos`, `day_events`, `notes`) plus **`getCalendarGridDateBounds`**.
- **`GET /api/day-workspace?date=YYYY-MM-DD`** — Notes, events, todos, carry-forward candidates for that day. Implemented via **`getDayWorkspaceBundle`** in **`lib/daydeck/day-workspace.ts`**: one nested `days` select (`notes`, `day_events`, `todos`) in parallel with **`getCarryForwardCandidatesForUser`** (single join query on `todos` + `days!inner` for the previous calendar day).
- **CRUD**: `/api/day-workspace/notes`, `.../events`, `.../todos`, `PATCH`/`DELETE` by id; **`POST .../carry-forward`**.

Domain logic: `lib/daydeck/*.ts` (days, **day-workspace**, notes, events, todos, carry-forward, **calendar-grid**, mappers).

## Main UI — `components/calendar/calendar-page.tsx`

Large client component; calendar + day workspace (rails: Events → Tasks → Notes).

### App shell (`app/app/page.tsx`)

- Quiet **Daydeck** wordmark; **settings** → **`/app/settings`** (gear); **log out** beside it.
- **`app-page-safe`** class in **`app/globals.css`**: safe-area-aware horizontal/bottom padding; tighter padding on narrow viewports, stepped up at `sm` and `lg`.
- **`viewport.viewportFit: "cover"`** in **`app/layout.tsx`** so `env(safe-area-inset-*)` works on notched devices.

### Layout — desktop (`lg` and up)

- **Split**: calendar column (~54% when panel open) + **selected day** column (~46%).
- **Workspace order**: **Events**, **Tasks**, **Notes** — each a **`WorkspaceRail`** (collapsible). **Open panel** / **Close panel** toggles the right column.
- **Click a day**: selects it and opens the workspace. **Click the same day again** while the panel is open: **closes** the workspace (toggle).
- **Page scroll** preferred; day workspace on narrow mobile can scroll inside its panel (`max-lg:overflow-y-auto` when in day view).

### Layout — below `lg` (phones / narrow tablets)

- **`mobileShowsCalendar`** is derived: **`isLgViewport \|\| !isWorkspaceOpen`**. You either see **calendar only** or **full-width day workspace**, not both stacked.
- **Pick a day** (or **Today**): calendar hides; **back** (chevron in the day header) returns to the calendar and closes the workspace.
- **Same day** tap again does not toggle close on mobile — use **back**.
- **Workspace rails (mobile)**: Events / Tasks / Notes start **collapsed** when you open a day so you can jump to a section without long scrolling. Choosing another day resets them collapsed. **Desktop** keeps all three **expanded** when a day is open.
- **Resize**: crossing the `lg` breakpoint syncs rail open state (expanded on desktop, collapsed on mobile when the workspace is open).
- **Scroll**: `scrollIntoView` for the workspace panel runs only on **desktop** when the panel opens (`behavior: "auto"`), not on mobile.

### Month header

- **Month / year** with **Today**, **Prev**, **Next**. **Today** jumps to the current month, selects today, opens the workspace (always lands on today with the workspace open on desktop; mobile goes to day view for today).

### Calendar day cells

- **Grid layout** (`grid-rows`): top row = event/note badges + today dot; middle = day number; bottom = todo urgency strip — avoids overlap between badges and the date.
- **Aspect**: **`aspect-[3/4]`** below `400px` width (taller tap targets); **`aspect-[5/4]`** from `400px` up.
- **Corner (top-left)**: calendar + document icons with counts (`CalendarDayCornerContentIndicators`). **Today**: dot top-right in the top row. On small widths, badges can sit in a horizontal row; **`lg`** uses a stacked column.
- **Todo strip (bottom)** (`CalendarDayTodoIndicators`): three dots (urgent / moderate / not_urgent) + **incomplete** counts; padded inset so dots are not flush on cell borders; muted styling for zero counts. Live merge via **`calendarSummaryForGrid`** when the day workspace is loaded.
- **Motion**: hover/active scale on day buttons; `motion-safe:` / `motion-reduce:` where relevant.
- **Prefetch**: debounced pointer prefetch of `/api/day-workspace` + short warm cache.

### Tasks (workspace)

- **Mobile / narrow**: checkbox + task text on one row; urgency swatches + **Delete** on the next row (no overlap with wrapped text). **Desktop `lg`**: single row when space allows.
- Urgency swatches (red / amber / green), sort by urgency, carry-forward banner when applicable.

### Events UX

- **No autosave** on keystroke for events.
- **Draft** while expanded; **Save** PATCHes then collapses to a summary row. **Cancel** discards. **Add event** creates on server then opens editor.

### Workspace rails

- **`WorkspaceRail`** — collapsible sections; inner padding tighter on mobile (`max-lg`).

## Account settings — `/app/settings`

- **`app/app/settings/page.tsx`**: session required; account email; **change password**; **send password reset email** via server actions in **`lib/auth/actions.ts`**.

## Auth

- **`/auth`**: `app/auth/page.tsx` + **`components/auth/auth-form.tsx`**.
- **Tabs**: **Log in** and **Sign up**. **Reset password** under the primary submit on log-in.
- **Sign up** / recovery **set new password** include **confirm password**; validated in **`signupAction`** / **`updatePasswordAction`**.
- **Email**: `type="text"`, `inputMode="email"`; **`normalizeAuthEmail`** in **`lib/auth/actions.ts`**.
- **`app/auth/confirm/route.ts`**: **`code`** → **`exchangeCodeForSession`**; else **`token_hash` + `type`** → **`verifyOtp`**.
- **Supabase**: **Site URL** and **Redirect URLs** must match the app origin (including port).

## Env

- **`.env.local`** is gitignored. Never commit secrets.

## Commands

```bash
cd daydeck-app
npm install
npm run dev
npm run lint
npm run build
```

---

## How to use this in a new chat

1. Open a **new** Cursor chat (Composer or Agent).
2. **`@`-reference this file**: **`daydeck-app/CONTEXT.md`**, or paste sections you need.
3. Ask your question, e.g. *“Read CONTEXT.md — I want to …”*

Optional hints: *Day workspace bundle is **`getDayWorkspaceBundle`**; calendar summary is **`CalendarDayContentSummary`**; mobile uses **`mobileShowsCalendar`** / back to calendar; rails default collapsed on mobile.*
