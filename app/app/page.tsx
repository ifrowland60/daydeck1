import Link from "next/link";
import { redirect } from "next/navigation";

import { CalendarPage } from "@/components/calendar/calendar-page";
import { logoutAction } from "@/lib/auth/actions";
import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { getCalendarDayContentSummaryForMonth } from "@/lib/daydeck/days";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/auth");
  }

  const today = new Date();
  const initialSelectedDateIso = today.toISOString().slice(0, 10);
  const initialCalendarSummary = await getCalendarDayContentSummaryForMonth(
    today.getFullYear(),
    today.getMonth() + 1,
  );

  return (
    <main className="app-page-safe mx-auto min-h-screen w-full max-w-6xl">
      <header className="mb-4 flex items-center justify-between lg:mb-6">
        <h1 className="text-lg font-light tracking-[0.04em] text-slate-500 sm:text-xl lg:text-2xl">Daydeck</h1>
        <div className="flex items-center gap-1.5 lg:gap-2">
          <Link
            href="/app/settings"
            aria-label="Account settings"
            title="Account settings"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:bg-slate-50 lg:h-10 lg:w-10 lg:rounded-lg"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 lg:h-5 lg:w-5" fill="none">
              <path
                d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1.2 1.2 0 0 1 0 1.7l-1.6 1.6a1.2 1.2 0 0 1-1.7 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9v.2a1.2 1.2 0 0 1-1.2 1.2h-2.2a1.2 1.2 0 0 1-1.2-1.2V20a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1.2 1.2 0 0 1-1.7 0l-1.6-1.6a1.2 1.2 0 0 1 0-1.7l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6h-.2a1.2 1.2 0 0 1-1.2-1.2V11a1.2 1.2 0 0 1 1.2-1.2h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1.2 1.2 0 0 1 0-1.7l1.6-1.6a1.2 1.2 0 0 1 1.7 0l.1.1a1 1 0 0 0 1.1.2h0a1 1 0 0 0 .6-.9V3.8a1.2 1.2 0 0 1 1.2-1.2h2.2a1.2 1.2 0 0 1 1.2 1.2V4a1 1 0 0 0 .6.9h0a1 1 0 0 0 1.1-.2l.1-.1a1.2 1.2 0 0 1 1.7 0l1.6 1.6a1.2 1.2 0 0 1 0 1.7l-.1.1a1 1 0 0 0-.2 1.1v0a1 1 0 0 0 .9.6h.2A1.2 1.2 0 0 1 22 11v2.2a1.2 1.2 0 0 1-1.2 1.2h-.2a1 1 0 0 0-.9.6Z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              aria-label="Log out"
              title="Log out"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:bg-slate-50 lg:h-10 lg:w-10 lg:rounded-lg"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 lg:h-5 lg:w-5" fill="none">
                <path
                  d="M14 4h-8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 12h10m0 0-3-3m3 3-3 3"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </form>
        </div>
      </header>

      <CalendarPage
        initialSelectedDateIso={initialSelectedDateIso}
        initialCalendarSummary={initialCalendarSummary}
      />
    </main>
  );
}
