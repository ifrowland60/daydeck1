import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { getSignedInUserId } from "@/lib/daydeck/days";
import { mapTodo } from "@/lib/daydeck/mappers";
import type { CarryForwardCandidate, Todo, TodoRow } from "@/types/daydeck";

type ServerSupabase = Awaited<ReturnType<typeof getSupabaseServerClient>>;

function previousDateIso(date: string) {
  const current = new Date(`${date}T00:00:00Z`);
  current.setUTCDate(current.getUTCDate() - 1);
  return current.toISOString().slice(0, 10);
}

/**
 * Carry-forward todos from the previous calendar day — one round-trip via join on `days`.
 * Pass the same `supabase` client as other queries in the request to avoid extra client setup.
 */
export async function getCarryForwardCandidatesForUser(
  supabase: ServerSupabase,
  userId: string,
  date: string,
): Promise<CarryForwardCandidate[]> {
  const previousDate = previousDateIso(date);

  const { data, error } = await supabase
    .from("todos")
    .select("id, content, urgency, days!inner(user_id, date)")
    .eq("is_complete", false)
    .eq("source_type", "native")
    .eq("days.user_id", userId)
    .eq("days.date", previousDate);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CarryForwardCandidate[];
}

export async function getCarryForwardCandidates(date: string): Promise<CarryForwardCandidate[]> {
  const supabase = await getSupabaseServerClient();
  const userId = await getSignedInUserId();
  return getCarryForwardCandidatesForUser(supabase, userId, date);
}

export async function carryForwardTodos(
  dayId: string,
  sourceTodos: CarryForwardCandidate[],
): Promise<Todo[]> {
  if (sourceTodos.length === 0) {
    return [];
  }

  const supabase = await getSupabaseServerClient();

  const carriedRows = sourceTodos.map((todo) => ({
    day_id: dayId,
    content: todo.content,
    urgency: todo.urgency,
    source_type: "carried",
    carried_from_todo_id: todo.id,
  }));

  const { data, error } = await supabase
    .from("todos")
    .insert(carriedRows)
    .select("*")
    .returns<TodoRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data.map(mapTodo);
}
