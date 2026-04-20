export interface Day {
  id: string;
  userId: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  dayId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

/** Calendar-day event (one line title, short description, optional local time). */
export interface DayEvent {
  id: string;
  dayId: string;
  title: string;
  description: string;
  /** Local clock time for that calendar day, `HH:mm`, or null if unset */
  eventTime: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Todo {
  id: string;
  dayId: string;
  content: string;
  isComplete: boolean;
  urgency: TodoUrgency;
  sourceType: "native" | "carried";
  carriedFromTodoId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CarryForwardCandidate {
  id: string;
  content: string;
  urgency: TodoUrgency;
}

export interface DayRow {
  id: string;
  user_id: string;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface NoteRow {
  id: string;
  day_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface DayEventRow {
  id: string;
  day_id: string;
  title: string;
  description: string;
  event_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface TodoRow {
  id: string;
  day_id: string;
  content: string;
  is_complete: boolean;
  urgency: TodoUrgency;
  source_type: "native" | "carried";
  carried_from_todo_id: string | null;
  created_at: string;
  updated_at: string;
}

export type TodoUrgency = "urgent" | "moderate" | "not_urgent";

/** Counts of open (incomplete) todos by urgency for a calendar day. */
export type TodoUrgencyCounts = {
  urgent: number;
  moderate: number;
  not_urgent: number;
};

/** Month grid payload for calendar indicators (todos, events, notes per ISO date). */
export type CalendarDayContentSummary = {
  todoUrgencyByDate: Record<string, TodoUrgencyCounts>;
  eventCountByDate: Record<string, number>;
  noteCountByDate: Record<string, number>;
};
