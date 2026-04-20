"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import type { DayEvent, Note, TodoUrgencyCounts } from "@/types/daydeck";

type CalendarPageProps = {
  initialSelectedDateIso: string;
  initialTodoUrgencyByDate: Record<string, TodoUrgencyCounts>;
};

type Todo = {
  id: string;
  content: string;
  isComplete: boolean;
  urgency: TodoUrgency;
  carriedFromTodoId: string | null;
  /** ISO from API; used to order tasks within the same urgency */
  createdAt?: string;
};

type TodoUrgency = "urgent" | "moderate" | "not_urgent";

type CarryCandidate = {
  id: string;
  content: string;
  urgency: TodoUrgency;
};

type CalendarCell = {
  isoDate: string;
  dayNumber: number;
  isCurrentMonth: boolean;
};

const URGENCY_LEVELS: { value: TodoUrgency; fill: string; ring: string; label: string }[] = [
  { value: "urgent", fill: "bg-red-500", ring: "ring-red-600", label: "Urgent" },
  { value: "moderate", fill: "bg-amber-400", ring: "ring-amber-500", label: "Moderate" },
  { value: "not_urgent", fill: "bg-emerald-500", ring: "ring-emerald-600", label: "Not urgent" },
];

function summarizeOpenTodoUrgency(todos: Todo[]): TodoUrgencyCounts {
  const c: TodoUrgencyCounts = { urgent: 0, moderate: 0, not_urgent: 0 };
  for (const t of todos) {
    if (t.isComplete) {
      continue;
    }
    if (t.urgency === "urgent") {
      c.urgent += 1;
    } else if (t.urgency === "moderate") {
      c.moderate += 1;
    } else if (t.urgency === "not_urgent") {
      c.not_urgent += 1;
    }
  }
  return c;
}

function CalendarDayTodoIndicators({
  counts,
  selected,
}: {
  counts: TodoUrgencyCounts | undefined;
  selected: boolean;
}) {
  const c = counts ?? { urgent: 0, moderate: 0, not_urgent: 0 };
  const rows = [
    { n: c.urgent, on: "bg-red-500", off: selected ? "bg-white/30" : "bg-red-200" },
    { n: c.moderate, on: "bg-amber-400", off: selected ? "bg-white/30" : "bg-amber-100" },
    { n: c.not_urgent, on: "bg-emerald-500", off: selected ? "bg-white/30" : "bg-emerald-200" },
  ] as const;

  return (
    <div className="pointer-events-none flex items-center justify-center gap-0.5 pt-0.5">
      {rows.map(({ n, on, off }, i) => (
        <span key={i} className="inline-flex items-center gap-px">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${n > 0 ? on : off}`} />
          <span
            className={`min-w-[0.65rem] text-center text-[8px] font-medium tabular-nums leading-none sm:text-[9px] ${
              selected ? "text-white/85" : "text-slate-600"
            }`}
          >
            {n}
          </span>
        </span>
      ))}
    </div>
  );
}

function UrgencySwatchPicker({
  value,
  onChange,
  compact,
}: {
  value: TodoUrgency;
  onChange: (urgency: TodoUrgency) => void;
  compact?: boolean;
}) {
  const outer = compact ? "h-7 w-7" : "h-8 w-8";
  const inner = compact ? "h-3.5 w-3.5" : "h-[18px] w-[18px]";

  return (
    <div role="radiogroup" aria-label="Urgency" className="flex shrink-0 items-center gap-1">
      {URGENCY_LEVELS.map(({ value: level, fill, ring, label }) => {
        const selected = value === level;
        return (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            onClick={() => onChange(level)}
            className={`${outer} inline-flex items-center justify-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 ${
              selected ? `ring-2 ring-offset-1 ring-offset-white ${ring}` : "ring-1 ring-transparent hover:ring-slate-300"
            }`}
          >
            <span className={`${inner} ${fill} rounded-full`} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}

function WorkspaceRail({
  label,
  open,
  onToggle,
  className = "",
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex w-full shrink-0 flex-col border-slate-200 bg-white transition-[width] duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] motion-reduce:transition-none lg:border-l-0 ${
        open ? "lg:min-w-0 lg:max-w-none lg:w-full" : "lg:w-12 lg:min-w-12 lg:max-w-12"
      } ${className}`}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className={`flex w-full shrink-0 items-center gap-2 border-b border-slate-100 px-3 py-3 text-left transition-colors hover:bg-slate-50 ${
          open ? "lg:justify-between lg:px-2 lg:py-2.5" : "lg:flex-col lg:items-center lg:justify-center lg:gap-2 lg:border-b-0 lg:py-4 lg:px-0"
        }`}
      >
        <span className="text-sm font-medium text-slate-900 lg:hidden">{label}</span>
        {open ? (
          <span className="hidden truncate text-sm font-medium text-slate-900 lg:inline">{label}</span>
        ) : (
          <span className="hidden text-center text-[11px] font-semibold uppercase tracking-wide text-slate-600 lg:inline lg:[writing-mode:vertical-rl] lg:rotate-180">
            {label}
          </span>
        )}
        <span
          className={`ml-auto inline-block text-slate-500 transition-transform duration-300 ease-out motion-reduce:transition-none lg:ml-0 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          ▾
        </span>
      </button>
      <div className={open ? "flex flex-col" : "hidden"}>
        <div className="px-3 py-3">{children}</div>
      </div>
    </div>
  );
}

function serializeEvent(e: Pick<DayEvent, "title" | "description" | "eventTime">) {
  return `${e.title}\n${e.description}\n${e.eventTime ?? ""}`;
}

function formatEventTimeLabel(eventTime: string | null): string {
  if (!eventTime) {
    return "No time";
  }
  const [hStr, mStr] = eventTime.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) {
    return eventTime;
  }
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

type EventDraft = Pick<DayEvent, "title" | "description" | "eventTime">;

export function CalendarPage({
  initialSelectedDateIso,
  initialTodoUrgencyByDate,
}: CalendarPageProps) {
  const initialDate = useMemo(() => new Date(`${initialSelectedDateIso}T00:00:00`), [initialSelectedDateIso]);
  const [visibleMonth, setVisibleMonth] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  const [selectedDateIso, setSelectedDateIso] = useState(initialSelectedDateIso);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [todoUrgencyByDate, setTodoUrgencyByDate] =
    useState<Record<string, TodoUrgencyCounts>>(initialTodoUrgencyByDate);
  const [notes, setNotes] = useState<Note[]>([]);
  const [events, setEvents] = useState<DayEvent[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [carryCandidates, setCarryCandidates] = useState<CarryCandidate[]>([]);
  const [dismissedCarryDates, setDismissedCarryDates] = useState<Set<string>>(new Set());
  const [newTodo, setNewTodo] = useState("");
  const [newTodoUrgency, setNewTodoUrgency] = useState<TodoUrgency>("moderate");
  const [isEventsRailOpen, setIsEventsRailOpen] = useState(true);
  const [isTasksRailOpen, setIsTasksRailOpen] = useState(true);
  const [isNotesBelowCalendarOpen, setIsNotesBelowCalendarOpen] = useState(true);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const pendingNoteSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastSavedNoteContent = useRef<Record<string, string>>({});
  const notesRef = useRef<Note[]>([]);
  const todosRef = useRef<Todo[]>([]);
  const eventsRef = useRef<DayEvent[]>([]);
  const lastSavedEventSnapshot = useRef<Record<string, string>>({});
  const [expandedEventIds, setExpandedEventIds] = useState(() => new Set<string>());
  const [eventDrafts, setEventDrafts] = useState<Record<string, EventDraft>>({});

  const clearAllPendingWorkspaceSaveTimers = useCallback(() => {
    for (const timer of Object.values(pendingNoteSaveTimers.current)) {
      clearTimeout(timer);
    }
    pendingNoteSaveTimers.current = {};
  }, []);

  const todayIso = toIsoDate(new Date());
  const monthLabel = visibleMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth() + 1;
    let cancelled = false;

    async function loadMonthContent() {
      try {
        const response = await fetch(`/api/day-content?year=${year}&month=${month}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as { todoUrgencyByDate?: Record<string, TodoUrgencyCounts> };
        if (!cancelled) {
          setTodoUrgencyByDate(payload.todoUrgencyByDate ?? {});
        }
      } catch {
        /* ignore month indicator fetch errors */
      }
    }

    void loadMonthContent();
    return () => {
      cancelled = true;
    };
  }, [visibleMonth]);

  useEffect(() => {
    notesRef.current = notes;
    todosRef.current = todos;
    eventsRef.current = events;
  }, [notes, todos, events]);

  useEffect(() => {
    if (!isWorkspaceOpen) {
      return;
    }

    let cancelled = false;

    async function loadWorkspace() {
      setIsLoadingWorkspace(true);
      setStatusMessage(null);
      clearAllPendingWorkspaceSaveTimers();
      try {
        const response = await fetch(`/api/day-workspace?date=${selectedDateIso}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Unable to load selected day.");
        }
        const payload = (await response.json()) as {
          notes?: Note[];
          events?: DayEvent[];
          todos: Todo[];
          carryCandidates: CarryCandidate[];
        };
        if (cancelled) {
          return;
        }
        const loadedNotes = payload.notes ?? [];
        setNotes(loadedNotes);
        lastSavedNoteContent.current = {};
        for (const n of loadedNotes) {
          lastSavedNoteContent.current[n.id] = n.content;
        }
        const loadedEvents = payload.events ?? [];
        setEvents(loadedEvents);
        setExpandedEventIds(new Set());
        setEventDrafts({});
        lastSavedEventSnapshot.current = {};
        for (const e of loadedEvents) {
          lastSavedEventSnapshot.current[e.id] = serializeEvent(e);
        }
        setTodos(payload.todos ?? []);
        setCarryCandidates(payload.carryCandidates ?? []);
      } catch (error) {
        if (!cancelled) {
          setStatusMessage(error instanceof Error ? error.message : "Unable to load selected day.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingWorkspace(false);
        }
      }
    }

    void loadWorkspace();
    return () => {
      cancelled = true;
    };
  }, [isWorkspaceOpen, selectedDateIso, clearAllPendingWorkspaceSaveTimers]);

  useEffect(() => {
    return () => {
      clearAllPendingWorkspaceSaveTimers();
    };
  }, [selectedDateIso, clearAllPendingWorkspaceSaveTimers]);

  useEffect(() => {
    if (!isWorkspaceOpen) {
      clearAllPendingWorkspaceSaveTimers();
    }
  }, [isWorkspaceOpen, clearAllPendingWorkspaceSaveTimers]);

  useEffect(() => {
    if (!isWorkspaceOpen || isLoadingWorkspace) {
      return;
    }

    for (const n of notes) {
      if (n.content === lastSavedNoteContent.current[n.id]) {
        continue;
      }
      const prev = pendingNoteSaveTimers.current[n.id];
      if (prev) {
        clearTimeout(prev);
      }
      const noteId = n.id;
      pendingNoteSaveTimers.current[noteId] = setTimeout(() => {
        const latest = notesRef.current.find((x) => x.id === noteId);
        if (!latest) {
          delete pendingNoteSaveTimers.current[noteId];
          return;
        }
        if (latest.content === lastSavedNoteContent.current[noteId]) {
          delete pendingNoteSaveTimers.current[noteId];
          return;
        }

        void (async () => {
          try {
            const res = await fetch(`/api/day-workspace/notes/${noteId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content: latest.content }),
            });
            const payload = (await res.json()) as { note?: Note; error?: string };
            if (!res.ok || !payload.note) {
              setStatusMessage(payload.error ?? "Unable to save note.");
              return;
            }
            lastSavedNoteContent.current[noteId] = latest.content;
          } catch {
            setStatusMessage("Unable to save note right now.");
          } finally {
            delete pendingNoteSaveTimers.current[noteId];
          }
        })();
      }, 500);
    }
  }, [notes, isWorkspaceOpen, isLoadingWorkspace, selectedDateIso]);

  const cells = useMemo(() => buildMonthCells(visibleMonth), [visibleMonth]);
  const todoUrgencyByDateForGrid = useMemo(() => {
    if (!isWorkspaceOpen || isLoadingWorkspace) {
      return todoUrgencyByDate;
    }
    return {
      ...todoUrgencyByDate,
      [selectedDateIso]: summarizeOpenTodoUrgency(todos),
    };
  }, [todoUrgencyByDate, isWorkspaceOpen, isLoadingWorkspace, selectedDateIso, todos]);
  const sortedTodos = useMemo(() => sortTodosByUrgencyDescending(todos), [todos]);
  const selectedDateLabel = formatReadableDate(selectedDateIso);

  function handleNoteChange(noteId: string, value: string) {
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, content: value } : n)));
  }

  async function handleAddNote() {
    try {
      const response = await fetch("/api/day-workspace/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDateIso, content: "" }),
      });
      const payload = (await response.json()) as { note?: Note; error?: string };
      if (!response.ok || !payload.note) {
        setStatusMessage(payload.error ?? "Unable to add note.");
        return;
      }
      const newNote = payload.note;
      setNotes((prev) => [...prev, newNote]);
      lastSavedNoteContent.current[newNote.id] = "";
    } catch {
      setStatusMessage("Unable to add note right now.");
    }
  }

  async function handleDeleteNote(noteId: string) {
    const pending = pendingNoteSaveTimers.current[noteId];
    if (pending) {
      clearTimeout(pending);
      delete pendingNoteSaveTimers.current[noteId];
    }

    try {
      const response = await fetch(`/api/day-workspace/notes/${noteId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setStatusMessage("Unable to remove note.");
        return;
      }
      const remainingAfterDelete = notes.filter((n) => n.id !== noteId);
      setNotes(remainingAfterDelete);
      delete lastSavedNoteContent.current[noteId];
    } catch {
      setStatusMessage("Unable to remove note right now.");
    }
  }

  function updateEventDraft(eventId: string, patch: Partial<EventDraft>) {
    setEventDrafts((prev) => {
      const cur = prev[eventId];
      if (!cur) {
        return prev;
      }
      return { ...prev, [eventId]: { ...cur, ...patch } };
    });
  }

  function openEventEditor(eventId: string, source: DayEvent) {
    setEventDrafts((prev) => ({
      ...prev,
      [eventId]: {
        title: source.title,
        description: source.description,
        eventTime: source.eventTime,
      },
    }));
    setExpandedEventIds((prev) => new Set(prev).add(eventId));
  }

  function closeEventEditor(eventId: string) {
    setExpandedEventIds((prev) => {
      const next = new Set(prev);
      next.delete(eventId);
      return next;
    });
    setEventDrafts((prev) => {
      const rest = { ...prev };
      delete rest[eventId];
      return rest;
    });
  }

  async function handleSaveEvent(eventId: string) {
    const draft = eventDrafts[eventId];
    if (!draft) {
      return;
    }
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/day-workspace/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          description: draft.description,
          eventTime: draft.eventTime,
        }),
      });
      const payload = (await res.json()) as { event?: DayEvent; error?: string };
      if (!res.ok || !payload.event) {
        setStatusMessage(payload.error ?? "Unable to save event.");
        return;
      }
      const saved = payload.event;
      lastSavedEventSnapshot.current[eventId] = serializeEvent(saved);
      setEvents((prev) => prev.map((e) => (e.id === eventId ? saved : e)));
      closeEventEditor(eventId);
    } catch {
      setStatusMessage("Unable to save event right now.");
    }
  }

  async function handleAddEvent() {
    try {
      const response = await fetch("/api/day-workspace/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDateIso, title: "", description: "", eventTime: null }),
      });
      const payload = (await response.json()) as { event?: DayEvent; error?: string };
      if (!response.ok || !payload.event) {
        setStatusMessage(payload.error ?? "Unable to add event.");
        return;
      }
      const ev = payload.event;
      setEvents((prev) => [...prev, ev]);
      lastSavedEventSnapshot.current[ev.id] = serializeEvent(ev);
      openEventEditor(ev.id, ev);
    } catch {
      setStatusMessage("Unable to add event right now.");
    }
  }

  async function handleDeleteEvent(eventId: string) {
    try {
      const response = await fetch(`/api/day-workspace/events/${eventId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setStatusMessage("Unable to remove event.");
        return;
      }
      const remaining = events.filter((e) => e.id !== eventId);
      setEvents(remaining);
      closeEventEditor(eventId);
      delete lastSavedEventSnapshot.current[eventId];
    } catch {
      setStatusMessage("Unable to remove event right now.");
    }
  }

  function handleSelectDate(isoDate: string) {
    setSelectedDateIso(isoDate);
    setIsWorkspaceOpen(true);
    setIsEventsRailOpen(true);
    setIsTasksRailOpen(true);
    setIsNotesBelowCalendarOpen(true);
  }

  async function handleAddTodo() {
    const content = newTodo.trim();
    if (!content) {
      return;
    }

    const response = await fetch("/api/day-workspace/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: selectedDateIso, content, urgency: newTodoUrgency }),
    });
    const payload = (await response.json()) as { todo?: Todo; error?: string };
    if (!response.ok || !payload.todo) {
      setStatusMessage(payload.error ?? "Unable to add task.");
      return;
    }

    setTodos((prev) => [...prev, payload.todo as Todo]);
    setNewTodo("");
    setNewTodoUrgency("moderate");
  }

  async function handleToggleTodo(todoId: string, isComplete: boolean) {
    const response = await fetch(`/api/day-workspace/todos/${todoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isComplete: !isComplete }),
    });
    const payload = (await response.json()) as { todo?: Todo; error?: string };
    if (!response.ok || !payload.todo) {
      setStatusMessage(payload.error ?? "Unable to update task.");
      return;
    }
    setTodos((prev) => prev.map((todo) => (todo.id === todoId ? (payload.todo as Todo) : todo)));
  }

  async function handleDeleteTodo(todoId: string) {
    const response = await fetch(`/api/day-workspace/todos/${todoId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setStatusMessage("Unable to delete task.");
      return;
    }
    setTodos((prev) => prev.filter((todo) => todo.id !== todoId));
  }

  async function handleUpdateTodoUrgency(todoId: string, urgency: TodoUrgency) {
    const response = await fetch(`/api/day-workspace/todos/${todoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urgency }),
    });
    const payload = (await response.json()) as { todo?: Todo; error?: string };
    if (!response.ok || !payload.todo) {
      setStatusMessage(payload.error ?? "Unable to update urgency.");
      return;
    }
    setTodos((prev) => prev.map((todo) => (todo.id === todoId ? (payload.todo as Todo) : todo)));
  }

  async function handleCarryForward() {
    const response = await fetch("/api/day-workspace/carry-forward", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: selectedDateIso }),
    });
    const payload = (await response.json()) as { todos?: Todo[]; error?: string };
    if (!response.ok || !payload.todos) {
      setStatusMessage(payload.error ?? "Unable to carry tasks forward.");
      return;
    }
    setTodos((prev) => [...prev, ...(payload.todos as Todo[])]);
    setCarryCandidates([]);
    setDismissedCarryDates((prev) => {
      const next = new Set(prev);
      next.delete(selectedDateIso);
      return next;
    });
  }

  function handleDeclineCarryForward() {
    setDismissedCarryDates((prev) => {
      const next = new Set(prev);
      next.add(selectedDateIso);
      return next;
    });
  }

  const workspaceRailsInner = (
    <>
      {isLoadingWorkspace ? (
        <p className="mb-2 text-sm text-slate-500">Loading day workspace...</p>
      ) : null}
      {statusMessage ? <p className="mb-2 text-sm text-red-600">{statusMessage}</p> : null}

      <div className="flex w-full flex-col divide-y divide-slate-200">
        <WorkspaceRail
          label="Events"
          open={isEventsRailOpen}
          onToggle={() => setIsEventsRailOpen((v) => !v)}
        >
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleAddEvent}
              className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Add event
            </button>
            {events.length === 0 ? (
              <p className="text-sm text-slate-500">
                No events yet. Add a title, details, and a time, then save. Saved events show as a compact line;
                click one to edit.
              </p>
            ) : (
              events.map((ev) => {
                const expanded = expandedEventIds.has(ev.id);
                const draft = eventDrafts[ev.id];

                if (!expanded) {
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      aria-expanded={false}
                      onClick={() => openEventEditor(ev.id, ev)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-left text-sm text-slate-900 transition hover:bg-slate-100"
                    >
                      <span className="min-w-0 truncate font-medium">
                        {ev.title.trim() ? ev.title.trim() : "Untitled event"}
                      </span>
                      <span className="shrink-0 tabular-nums text-xs text-slate-500">
                        {formatEventTimeLabel(ev.eventTime)}
                      </span>
                    </button>
                  );
                }

                const d = draft ?? {
                  title: ev.title,
                  description: ev.description,
                  eventTime: ev.eventTime,
                };

                return (
                  <div key={ev.id} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                    <label className="block text-xs font-medium text-slate-600">Title</label>
                    <input
                      value={d.title}
                      onChange={(e) => updateEventDraft(ev.id, { title: e.target.value })}
                      maxLength={200}
                      placeholder="Event title"
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-400"
                    />
                    <label className="mt-2 block text-xs font-medium text-slate-600">What it is</label>
                    <textarea
                      value={d.description}
                      onChange={(e) => updateEventDraft(ev.id, { description: e.target.value })}
                      rows={2}
                      maxLength={500}
                      placeholder="Short descriptor"
                      className="mt-1 w-full resize-y rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-400"
                    />
                    <label className="mt-2 block text-xs font-medium text-slate-600">Time</label>
                    <input
                      type="time"
                      value={d.eventTime ?? ""}
                      onChange={(e) =>
                        updateEventDraft(ev.id, { eventTime: e.target.value ? e.target.value : null })
                      }
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-400"
                    />
                    <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => closeEventEditor(ev.id)}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSaveEvent(ev.id)}
                        className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteEvent(ev.id)}
                        className="text-xs text-slate-500 hover:text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </WorkspaceRail>

        <WorkspaceRail label="Tasks" open={isTasksRailOpen} onToggle={() => setIsTasksRailOpen((v) => !v)}>
          {carryCandidates.length > 0 && !dismissedCarryDates.has(selectedDateIso) ? (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-900">Carry unfinished tasks forward?</p>
              <p className="mt-1 text-xs text-amber-800">
                {carryCandidates.length} unfinished task{carryCandidates.length > 1 ? "s" : ""} from yesterday.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCarryForward}
                  className="rounded-md border border-amber-300 px-3 py-1.5 text-xs text-amber-900 hover:bg-amber-100"
                >
                  Carry forward
                </button>
                <button
                  type="button"
                  onClick={handleDeclineCarryForward}
                  className="rounded-md border border-transparent px-2 py-1.5 text-xs text-amber-900 hover:underline"
                >
                  Not now
                </button>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            {sortedTodos.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                No tasks for this date yet
              </p>
            ) : (
              sortedTodos.map((todo) => (
                <div
                  key={todo.id}
                  className={`rounded-lg border px-3 py-2 ${urgencyRowClassName(todo.urgency)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <label className="flex min-w-0 flex-1 items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={todo.isComplete}
                        onChange={() => handleToggleTodo(todo.id, todo.isComplete)}
                        className="shrink-0"
                      />
                      <span className={todo.isComplete ? "line-through text-slate-400" : ""}>{todo.content}</span>
                    </label>
                    <div className="flex shrink-0 items-center gap-2">
                      <UrgencySwatchPicker
                        value={todo.urgency}
                        onChange={(urgency) => void handleUpdateTodoUrgency(todo.id, urgency)}
                      />
                      <button
                        type="button"
                        onClick={() => void handleDeleteTodo(todo.id)}
                        className="text-xs text-slate-500 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              placeholder=""
              aria-label="New task"
              className="min-w-[8rem] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
            />
            <UrgencySwatchPicker value={newTodoUrgency} onChange={setNewTodoUrgency} compact />
            <button
              type="button"
              onClick={() => void handleAddTodo()}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
            >
              Add
            </button>
          </div>
        </WorkspaceRail>
      </div>
    </>
  );

  return (
    <section className="flex flex-col gap-5 overflow-hidden rounded-xl border border-slate-200 bg-white lg:flex-row lg:items-start lg:gap-0 lg:overflow-visible">
      <div
        className={`flex flex-col rounded-xl border border-slate-200 bg-white p-5 sm:p-6 lg:min-w-[22rem] lg:rounded-none lg:border-0 lg:border-r lg:border-slate-200 ${
          isWorkspaceOpen ? "lg:max-w-[54%] lg:shrink-0 lg:flex-[1_1_54%]" : "lg:flex-1"
        }`}
      >
        <div className="shrink-0">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">{monthLabel}</h2>
          <div className="flex shrink-0 items-center gap-2">
            {!isWorkspaceOpen ? (
              <button
                type="button"
                onClick={() => setIsWorkspaceOpen(true)}
                className="hidden rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 lg:inline-flex"
              >
                Day panel
              </button>
            ) : null}
            <button
              type="button"
              onClick={() =>
                setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
              }
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() =>
                setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
              }
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>

        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium uppercase tracking-wide text-slate-500">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell) => {
            const isSelected = cell.isoDate === selectedDateIso;
            const isToday = cell.isoDate === todayIso;
            const todoCounts = todoUrgencyByDateForGrid[cell.isoDate];

            return (
              <button
                key={cell.isoDate}
                type="button"
                onClick={() => handleSelectDate(cell.isoDate)}
                className={`relative flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-md border py-1 text-sm transition sm:min-h-[3.75rem] ${
                  isSelected
                    ? "border-slate-900 bg-slate-900 text-white"
                    : cell.isCurrentMonth
                      ? "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                      : "border-slate-100 bg-slate-50 text-slate-400"
                }`}
              >
                {isToday && !isSelected ? (
                  <span className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-slate-900" />
                ) : null}
                <span className="leading-none">{cell.dayNumber}</span>
                <CalendarDayTodoIndicators counts={todoCounts} selected={isSelected} />
              </button>
            );
          })}
        </div>
        </div>

        {isWorkspaceOpen ? (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <button
              type="button"
              aria-expanded={isNotesBelowCalendarOpen}
              onClick={() => setIsNotesBelowCalendarOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-2 rounded-lg py-1.5 text-left text-slate-700 transition-colors hover:bg-slate-50"
            >
              <span className="flex items-baseline gap-2">
                <span className="text-sm font-medium">Notes</span>
                <span className="text-xs tabular-nums text-slate-500">({notes.length})</span>
              </span>
              <span
                className={`inline-block text-slate-500 transition-transform duration-300 ease-out motion-reduce:transition-none ${
                  isNotesBelowCalendarOpen ? "rotate-180" : ""
                }`}
                aria-hidden
              >
                ▾
              </span>
            </button>

            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] motion-reduce:transition-none ${
                isNotesBelowCalendarOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="min-h-0 overflow-hidden">
                <div
                  className={`flex flex-col gap-2 pt-2 transition-opacity duration-200 ease-out motion-reduce:transition-none ${
                    isNotesBelowCalendarOpen ? "opacity-100" : "pointer-events-none opacity-0"
                  }`}
                >
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddNote}
                      className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Add comment
                    </button>
                  </div>
                  {notes.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No notes yet. Use &quot;Add comment&quot; for a separate note on this day.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {notes.map((n) => (
                        <div key={n.id} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                          <textarea
                            value={n.content}
                            onChange={(e) => handleNoteChange(n.id, e.target.value)}
                            placeholder=""
                            aria-label="Note"
                            rows={4}
                            className="w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                          />
                          <div className="mt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => void handleDeleteNote(n.id)}
                              className="text-xs text-slate-500 hover:text-red-600"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div
        className={`flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white lg:rounded-none lg:border-0 lg:border-l lg:border-slate-200 lg:transition-[width] lg:duration-300 lg:ease-[cubic-bezier(0.33,1,0.68,1)] motion-reduce:lg:transition-none ${
          isWorkspaceOpen
            ? "lg:flex-[0_0_46%] lg:max-w-[46%] lg:min-w-0 lg:overflow-visible"
            : "lg:max-w-0 lg:w-0 lg:shrink-0 lg:overflow-hidden"
        } ${isWorkspaceOpen ? "lg:border-l" : "lg:border-l-0"}`}
      >
        <div className="flex w-full min-w-0 flex-col">
          <button
            type="button"
            aria-expanded={isWorkspaceOpen}
            onClick={() => setIsWorkspaceOpen((prev) => !prev)}
            className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-slate-50 sm:px-6 lg:shrink-0"
          >
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Selected day</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{selectedDateLabel}</p>
            </div>
            <span className="flex items-center gap-2 text-sm text-slate-600">
              <span className="lg:hidden">{isWorkspaceOpen ? "Hide" : "Open"}</span>
              <span className="hidden lg:inline">{isWorkspaceOpen ? "Close panel" : "Open panel"}</span>
              <span
                className={`inline-block transition-transform duration-300 ease-out motion-reduce:transition-none ${
                  isWorkspaceOpen ? "rotate-180" : ""
                }`}
                aria-hidden
              >
                ▾
              </span>
            </span>
          </button>

          <div
            className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] motion-reduce:transition-none lg:hidden ${
              isWorkspaceOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div className="min-h-0 overflow-hidden">
              <div
                className={`border-t border-slate-200 p-5 sm:p-6 transition-opacity duration-200 ease-out motion-reduce:transition-none ${
                  isWorkspaceOpen ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                {workspaceRailsInner}
              </div>
            </div>
          </div>

          <div
            className={`hidden flex-col border-t border-slate-200 lg:flex lg:border-t-0 ${
              isWorkspaceOpen ? "opacity-100" : "pointer-events-none opacity-0"
            } transition-opacity duration-200 ease-out motion-reduce:transition-none`}
          >
            <div className="flex flex-col px-4 py-4 sm:px-5 sm:py-5">{workspaceRailsInner}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function urgencyRowClassName(urgency: TodoUrgency) {
  if (urgency === "urgent") {
    return "border-red-200 bg-red-50";
  }
  if (urgency === "not_urgent") {
    return "border-emerald-200 bg-emerald-50";
  }
  return "border-amber-200 bg-amber-50";
}

function urgencyRank(urgency: TodoUrgency): number {
  if (urgency === "urgent") {
    return 3;
  }
  if (urgency === "moderate") {
    return 2;
  }
  return 1;
}

function sortTodosByUrgencyDescending(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    const byUrgency = urgencyRank(b.urgency) - urgencyRank(a.urgency);
    if (byUrgency !== 0) {
      return byUrgency;
    }
    const aTime = a.createdAt ?? "";
    const bTime = b.createdAt ?? "";
    if (bTime !== aTime) {
      return bTime.localeCompare(aTime);
    }
    return b.id.localeCompare(a.id);
  });
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatReadableDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function buildMonthCells(visibleMonth: Date): CalendarCell[] {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstDayIndex = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPreviousMonth = new Date(year, month, 0).getDate();
  const cells: CalendarCell[] = [];

  for (let i = firstDayIndex - 1; i >= 0; i -= 1) {
    const dayNumber = daysInPreviousMonth - i;
    const date = new Date(year, month - 1, dayNumber);
    cells.push({ isoDate: toIsoDate(date), dayNumber, isCurrentMonth: false });
  }

  for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
    const date = new Date(year, month, dayNumber);
    cells.push({ isoDate: toIsoDate(date), dayNumber, isCurrentMonth: true });
  }

  while (cells.length < 42) {
    const dayNumber = cells.length - (firstDayIndex + daysInMonth) + 1;
    const date = new Date(year, month + 1, dayNumber);
    cells.push({ isoDate: toIsoDate(date), dayNumber, isCurrentMonth: false });
  }

  return cells;
}
