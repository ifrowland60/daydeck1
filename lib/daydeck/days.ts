import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { getCalendarGridCellCount } from "@/lib/daydeck/calendar-grid";
import { mapDay } from "@/lib/daydeck/mappers";
import type { CalendarDayContentSummary, Day, DayRow, TodoUrgencyCounts } from "@/types/daydeck";

export async function getSignedInUserId() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("User is not authenticated.");
  }

  return user.id;
}

export async function getDayByDate(date: string) {
  const supabase = await getSupabaseServerClient();
  const userId = await getSignedInUserId();
  const { data, error } = await supabase
    .from("days")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle<DayRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapDay(data) : null;
}

export async function getOrCreateDay(date: string): Promise<Day> {
  const supabase = await getSupabaseServerClient();
  const userId = await getSignedInUserId();
  const { data, error } = await supabase
    .from("days")
    .upsert({ user_id: userId, date }, { onConflict: "user_id,date" })
    .select("*")
    .single<DayRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapDay(data);
}

export async function getDayDatesWithContentForMonth(
  year: number,
  month: number,
): Promise<string[]> {
  const supabase = await getSupabaseServerClient();
  const userId = await getSignedInUserId();

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("days")
    .select("date")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate)
    .returns<Array<{ date: string }>>();

  if (error) {
    throw new Error(error.message);
  }

  return data.map((row) => row.date);
}

/** ISO date bounds (inclusive) for the visible month grid (matches client `buildMonthCells`). */
export function getCalendarGridDateBounds(year: number, month: number): { start: string; end: string } {
  const monthIndex = month - 1;
  const firstDay = new Date(year, monthIndex, 1);
  const firstDayIndex = firstDay.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const daysInPreviousMonth = new Date(year, monthIndex, 0).getDate();
  const isos: string[] = [];

  for (let i = firstDayIndex - 1; i >= 0; i -= 1) {
    const dayNumber = daysInPreviousMonth - i;
    const date = new Date(year, monthIndex - 1, dayNumber);
    isos.push(date.toISOString().slice(0, 10));
  }
  for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
    const date = new Date(year, monthIndex, dayNumber);
    isos.push(date.toISOString().slice(0, 10));
  }
  const targetLength = getCalendarGridCellCount(year, month);
  while (isos.length < targetLength) {
    const dayNumber = isos.length - (firstDayIndex + daysInMonth) + 1;
    const date = new Date(year, monthIndex + 1, dayNumber);
    isos.push(date.toISOString().slice(0, 10));
  }
  const sorted = [...isos].sort();
  return { start: sorted[0]!, end: sorted[sorted.length - 1]! };
}

type DayRowCalendarSummary = {
  date: string;
  todos: Array<{ urgency: string; is_complete?: boolean }> | null;
  day_events: Array<{ id: string }> | null;
  notes: Array<{ id: string }> | null;
};

/** Open todos by urgency, event row counts, and note row counts per day for the visible month grid. */
export async function getCalendarDayContentSummaryForMonth(
  year: number,
  month: number,
): Promise<CalendarDayContentSummary> {
  const supabase = await getSupabaseServerClient();
  const userId = await getSignedInUserId();
  const { start, end } = getCalendarGridDateBounds(year, month);

  const { data, error } = await supabase
    .from("days")
    .select("date, todos(urgency, is_complete), day_events(id), notes(id)")
    .eq("user_id", userId)
    .gte("date", start)
    .lte("date", end)
    .returns<DayRowCalendarSummary[]>();

  if (error) {
    throw new Error(error.message);
  }

  const todoUrgencyByDate: Record<string, TodoUrgencyCounts> = {};
  const eventCountByDate: Record<string, number> = {};
  const noteCountByDate: Record<string, number> = {};

  for (const row of data ?? []) {
    const counts: TodoUrgencyCounts = { urgent: 0, moderate: 0, not_urgent: 0 };
    for (const t of row.todos ?? []) {
      if (t.is_complete) {
        continue;
      }
      if (t.urgency === "urgent") {
        counts.urgent += 1;
      } else if (t.urgency === "moderate") {
        counts.moderate += 1;
      } else if (t.urgency === "not_urgent") {
        counts.not_urgent += 1;
      }
    }
    if (counts.urgent > 0 || counts.moderate > 0 || counts.not_urgent > 0) {
      todoUrgencyByDate[row.date] = counts;
    }

    const evCount = row.day_events?.length ?? 0;
    if (evCount > 0) {
      eventCountByDate[row.date] = evCount;
    }

    const nCount = row.notes?.length ?? 0;
    if (nCount > 0) {
      noteCountByDate[row.date] = nCount;
    }
  }

  return { todoUrgencyByDate, eventCountByDate, noteCountByDate };
}
