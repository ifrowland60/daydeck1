import type { Day, DayRow, DayEvent, DayEventRow, Note, NoteRow, Todo, TodoRow } from "@/types/daydeck";

export function mapDay(row: DayRow): Day {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapNote(row: NoteRow): Note {
  return {
    id: row.id,
    dayId: row.day_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapDayEvent(row: DayEventRow): DayEvent {
  const raw = row.event_time;
  const eventTime =
    raw == null || String(raw).trim() === ""
      ? null
      : String(raw).length >= 5
        ? String(raw).slice(0, 5)
        : String(raw);

  return {
    id: row.id,
    dayId: row.day_id,
    title: row.title,
    description: row.description,
    eventTime,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    dayId: row.day_id,
    content: row.content,
    isComplete: row.is_complete,
    urgency: row.urgency,
    sourceType: row.source_type,
    carriedFromTodoId: row.carried_from_todo_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
