# Daydeck MVP App

Daydeck is a calm, day-centered planning app. This repository contains the MVP web app
foundation built with Next.js, TypeScript, Tailwind, and Supabase.

## Stack

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- Supabase (Auth + Postgres)
- Vercel deployment target

## Project Structure

```text
app/
components/
lib/
  auth/
  db/
  daydeck/
types/
styles/
```

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env template and add project values:

```bash
cp .env.example .env.local
```

3. Set these values in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Legacy compatibility:
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is also supported for older Supabase projects.

4. Run the app:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Supabase Notes

- `lib/db/supabase-browser.ts` contains the browser client helper.
- `lib/db/supabase-server.ts` contains the server client helper for App Router usage.
- `supabase/phase-3-schema.sql` contains the MVP schema and RLS policies.
- `lib/daydeck/` contains the Phase 3 data-access layer for days, notes, todos, and carry-forward logic.

## Phase 3 Database Setup

Run this once in Supabase SQL Editor:

1. Open `supabase/phase-3-schema.sql`
2. Copy/paste into SQL Editor
3. Execute

This creates:
- `days`, `notes`, `todos` tables
- `updated_at` triggers
- row-level security policies scoped to authenticated users

## Vercel Setup

When creating the Vercel project, add the same environment variables from `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Current Phase

Phase 3 is in progress: authentication is complete and core data model + data-access functions are scaffolded.
Next step is Phase 4 calendar shell and selected-day panel wiring.
