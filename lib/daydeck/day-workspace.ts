import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { getCarryForwardCandidatesForUser } from "@/lib/daydeck/carry-forward";
import { getSignedInUserId } from "@/lib/daydeck/days";
import { mapDayEvent, mapNote, mapTodo } from "@/lib/daydeck/mappers";
import type {
  CarryForwardCandidate,
  DayEvent,
  DayEventRow,
  Note,
  NoteRow,
  Todo,
  TodoRow,
} from "@/types/daydeck";

type DayWorkspaceBundleRow = {
  id: string;
  notes: NoteRow[] | null;
  day_events: DayEventRow[] | null;
  todos: TodoRow[] | null;
};

function sortByCreatedAt<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * One round-trip for the day's notes, events, and todos, in parallel with carry-forward candidates.
 */
export async function getDayWorkspaceBundle(date: string): Promise<{
  dayId: string | null;
  notes: Note[];
  events: DayEvent[];
  todos: Todo[];
  carryCandidates: CarryForwardCandidate[];
}> {
  const supabase = await getSupabaseServerClient();
  const userId = await getSignedInUserId();

  const [dayRes, carryCandidates] = await Promise.all([
    supabase
      .from("days")
      .select("id, notes(*), day_events(*), todos(*)")
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle<DayWorkspaceBundleRow>(),
    getCarryForwardCandidatesForUser(supabase, userId, date),
  ]);

  if (dayRes.error) {
    throw new Error(dayRes.error.message);
  }

  const row = dayRes.data;
  if (!row) {
    return {
      dayId: null,
      notes: [],
      events: [],
      todos: [],
      carryCandidates,
    };
  }

  const notes = sortByCreatedAt((row.notes ?? []).map(mapNote));
  const events = sortByCreatedAt((row.day_events ?? []).map(mapDayEvent));
  const todos = sortByCreatedAt((row.todos ?? []).map(mapTodo));

  return {
    dayId: row.id,
    notes,
    events,
    todos,
    carryCandidates,
  };
}
