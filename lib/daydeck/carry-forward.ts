import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { getSignedInUserId } from "@/lib/daydeck/days";
import { mapTodo } from "@/lib/daydeck/mappers";
import type { CarryForwardCandidate, Todo, TodoRow } from "@/types/daydeck";

function previousDateIso(date: string) {
  const current = new Date(`${date}T00:00:00Z`);
  current.setUTCDate(current.getUTCDate() - 1);
  return current.toISOString().slice(0, 10);
}

export async function getCarryForwardCandidates(date: string): Promise<CarryForwardCandidate[]> {
  const supabase = await getSupabaseServerClient();
  const userId = await getSignedInUserId();

  const { data: previousDay, error: dayError } = await supabase
    .from("days")
    .select("id")
    .eq("user_id", userId)
    .eq("date", previousDateIso(date))
    .maybeSingle<{ id: string }>();

  if (dayError) {
    throw new Error(dayError.message);
  }

  if (!previousDay) {
    return [];
  }

  const { data, error } = await supabase
    .from("todos")
    .select("id, content, urgency")
    .eq("day_id", previousDay.id)
    .eq("is_complete", false)
    .eq("source_type", "native")
    .returns<CarryForwardCandidate[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
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
