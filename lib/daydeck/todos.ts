import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { mapTodo } from "@/lib/daydeck/mappers";
import type { Todo, TodoRow, TodoUrgency } from "@/types/daydeck";

export async function getTodosByDayId(dayId: string): Promise<Todo[]> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .eq("day_id", dayId)
    .order("created_at", { ascending: true })
    .returns<TodoRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data.map(mapTodo);
}

export async function createTodo(dayId: string, content: string, urgency: TodoUrgency): Promise<Todo> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("todos")
    .insert({ day_id: dayId, content, urgency })
    .select("*")
    .single<TodoRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapTodo(data);
}

export async function updateTodo(
  todoId: string,
  updates: Partial<Pick<TodoRow, "content" | "is_complete" | "urgency">>,
): Promise<Todo> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("todos")
    .update(updates)
    .eq("id", todoId)
    .select("*")
    .single<TodoRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapTodo(data);
}

export async function deleteTodo(todoId: string) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("todos").delete().eq("id", todoId);

  if (error) {
    throw new Error(error.message);
  }
}
