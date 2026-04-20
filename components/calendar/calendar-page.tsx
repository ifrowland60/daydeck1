"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { getCalendarGridCellCount } from "@/lib/daydeck/calendar-grid";
import type { CalendarDayContentSummary, DayEvent, Note, TodoUrgencyCounts } from "@/types/daydeck";

type CalendarPageProps = {
  initialSelectedDateIso: string;
  initialCalendarSummary: CalendarDayContentSummary;
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

/** Matches GET /api/day-workspace JSON (carryCandidates filtered server-side). */
type DayWorkspacePayload = {
  notes?: Note[];
  events?: DayEvent[];
  todos: Todo[];
  carryCandidates: CarryCandidate[];
};

const WORKSPACE_WARM_CACHE_MS = 12_000;

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
/** Two-letter labels — fits ~320px-wide grids without crowding day cells. */
const WEEKDAY_LABELS_NARROW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

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

function CalendarDayCornerContentIndicators({
  eventCount,
  noteCount,
  selected,
}: {
  eventCount: number;
  noteCount: number;
  selected: boolean;
}) {
  const iconClass = selected ? "text-white/85" : "text-slate-600";
  const numClass = selected ? "text-white/90" : "text-slate-600";

  return (
    <div
      className={`pointer-events-none z-[1] flex min-w-0 shrink-0 items-center gap-x-1 gap-y-0 max-lg:max-w-[calc(100%-0.75rem)] max-lg:flex-row max-lg:flex-wrap lg:flex-col lg:items-start lg:gap-px ${iconClass}`}
      aria-hidden
    >
      <span className="flex items-center gap-0.5 leading-none">
        <svg
          className="h-2 w-2 shrink-0 lg:h-2.5 lg:w-2.5 min-[400px]:h-2.5 min-[400px]:w-2.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        <span
          className={`min-w-[0.4rem] text-[6px] font-semibold tabular-nums min-[400px]:min-w-[0.45rem] min-[400px]:text-[7px] lg:min-w-[0.5rem] lg:text-[8px] ${numClass}`}
        >
          {eventCount}
        </span>
      </span>
      <span className="flex items-center gap-0.5 leading-none">
        <svg
          className="h-2 w-2 shrink-0 lg:h-2.5 lg:w-2.5 min-[400px]:h-2.5 min-[400px]:w-2.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8M8 17h5" />
        </svg>
        <span
          className={`min-w-[0.4rem] text-[6px] font-semibold tabular-nums min-[400px]:min-w-[0.45rem] min-[400px]:text-[7px] lg:min-w-[0.5rem] lg:text-[8px] ${numClass}`}
        >
          {noteCount}
        </span>
      </span>
    </div>
  );
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
    <div className="pointer-events-none flex max-w-full shrink-0 items-center justify-center gap-1 min-[400px]:gap-1.5">
      {rows.map(({ n, on, off }, i) => (
        <span key={i} className="inline-flex items-center gap-0.5">
          <span
            className={`h-1 w-1 shrink-0 rounded-full min-[400px]:h-1.5 min-[400px]:w-1.5 lg:h-1.5 lg:w-1.5 ${n > 0 ? on : off} ${n === 0 ? "opacity-50" : ""}`}
          />
          <span
            className={`min-w-[0.45rem] text-center text-[6px] font-medium tabular-nums leading-none min-[400px]:min-w-[0.5rem] min-[400px]:text-[7px] lg:min-w-[0.6rem] lg:text-[8px] ${
              selected ? (n === 0 ? "text-white/35" : "text-white/85") : n === 0 ? "text-slate-400/70" : "text-slate-600"
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
  const outer = compact
    ? "h-6 w-6 max-lg:h-5 max-lg:w-5 lg:h-7 lg:w-7"
    : "h-7 w-7 max-lg:h-6 max-lg:w-6 lg:h-8 lg:w-8";
  const inner = compact
    ? "h-3 w-3 max-lg:h-2.5 max-lg:w-2.5 lg:h-3.5 lg:w-3.5"
    : "h-4 w-4 max-lg:h-3.5 max-lg:w-3.5 lg:h-[18px] lg:w-[18px]";

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
        className={`flex w-full shrink-0 items-center gap-2 border-b border-slate-100 px-2.5 py-2 text-left transition-colors hover:bg-slate-50 lg:px-3 lg:py-3 ${
          open ? "lg:justify-between lg:px-2 lg:py-2.5" : "lg:flex-col lg:items-center lg:justify-center lg:gap-2 lg:border-b-0 lg:py-4 lg:px-0"
        }`}
      >
        <span className="text-[13px] font-medium text-slate-900 lg:hidden">{label}</span>
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
        <div className="px-2.5 py-2 lg:px-3 lg:py-3">{children}</div>
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
  initialCalendarSummary,
}: CalendarPageProps) {
  const initialDate = useMemo(() => new Date(`${initialSelectedDateIso}T00:00:00`), [initialSelectedDateIso]);
  const [visibleMonth, setVisibleMonth] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  const [selectedDateIso, setSelectedDateIso] = useState(initialSelectedDateIso);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [calendarSummary, setCalendarSummary] = useState<CalendarDayContentSummary>(initialCalendarSummary);
  const [notes, setNotes] = useState<Note[]>([]);
  const [events, setEvents] = useState<DayEvent[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [carryCandidates, setCarryCandidates] = useState<CarryCandidate[]>([]);
  const [dismissedCarryDates, setDismissedCarryDates] = useState<Set<string>>(new Set());
  const [newTodo, setNewTodo] = useState("");
  const [newTodoUrgency, setNewTodoUrgency] = useState<TodoUrgency>("moderate");
  const [isEventsRailOpen, setIsEventsRailOpen] = useState(true);
  const [isTasksRailOpen, setIsTasksRailOpen] = useState(true);
  const [isNotesRailOpen, setIsNotesRailOpen] = useState(true);
  const [isLgViewport, setIsLgViewport] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches,
  );
  /** Below `lg`: calendar-only until a day is opened (`isWorkspaceOpen`). Desktop always shows calendar + panel. */
  const mobileShowsCalendar = isLgViewport || !isWorkspaceOpen;
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
  const workspaceWarmCacheRef = useRef<Map<string, { payload: DayWorkspacePayload; storedAt: number }>>(
    new Map(),
  );
  const prefetchWorkspaceTimersRef = useRef<Partial<Record<string, ReturnType<typeof setTimeout>>>>({});
  const mobileWorkspaceSectionRef = useRef<HTMLDivElement | null>(null);
  const prevWorkspaceOpenRef = useRef(false);
  const isWorkspaceOpenRef = useRef(false);

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
    workspaceWarmCacheRef.current.clear();
  }, [visibleMonth]);

  useEffect(() => {
    isWorkspaceOpenRef.current = isWorkspaceOpen;
  }, [isWorkspaceOpen]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const syncViewport = () => {
      const lg = mq.matches;
      setIsLgViewport(lg);
      if (isWorkspaceOpenRef.current) {
        if (lg) {
          setIsEventsRailOpen(true);
          setIsTasksRailOpen(true);
          setIsNotesRailOpen(true);
        } else {
          setIsEventsRailOpen(false);
          setIsTasksRailOpen(false);
          setIsNotesRailOpen(false);
        }
      }
    };
    syncViewport();
    mq.addEventListener("change", syncViewport);
    return () => mq.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    if (!isLgViewport || !isWorkspaceOpen || prevWorkspaceOpenRef.current) {
      prevWorkspaceOpenRef.current = isWorkspaceOpen;
      return;
    }
    const id = requestAnimationFrame(() => {
      mobileWorkspaceSectionRef.current?.scrollIntoView({ behavior: "auto", block: "nearest" });
    });
    prevWorkspaceOpenRef.current = isWorkspaceOpen;
    return () => cancelAnimationFrame(id);
  }, [isWorkspaceOpen, isLgViewport]);

  const scheduleWorkspacePrefetch = useCallback((isoDate: string) => {
    const prev = prefetchWorkspaceTimersRef.current[isoDate];
    if (prev) {
      clearTimeout(prev);
    }
    prefetchWorkspaceTimersRef.current[isoDate] = setTimeout(() => {
      delete prefetchWorkspaceTimersRef.current[isoDate];
      void (async () => {
        try {
          const response = await fetch(`/api/day-workspace?date=${encodeURIComponent(isoDate)}`, {
            cache: "no-store",
          });
          if (!response.ok) {
            return;
          }
          const payload = (await response.json()) as DayWorkspacePayload;
          workspaceWarmCacheRef.current.set(isoDate, { payload, storedAt: Date.now() });
        } catch {
          /* ignore prefetch errors */
        }
      })();
    }, 120);
  }, []);

  const cancelWorkspacePrefetch = useCallback((isoDate: string) => {
    const t = prefetchWorkspaceTimersRef.current[isoDate];
    if (t) {
      clearTimeout(t);
      delete prefetchWorkspaceTimersRef.current[isoDate];
    }
  }, []);

  const invalidateWorkspaceWarmCache = useCallback((isoDate: string) => {
    workspaceWarmCacheRef.current.delete(isoDate);
  }, []);

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
        const payload = (await response.json()) as Partial<CalendarDayContentSummary> & { error?: string };
        if (!cancelled && !payload.error) {
          setCalendarSummary({
            todoUrgencyByDate: payload.todoUrgencyByDate ?? {},
            eventCountByDate: payload.eventCountByDate ?? {},
            noteCountByDate: payload.noteCountByDate ?? {},
          });
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

    function applyWorkspacePayload(payload: DayWorkspacePayload) {
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
    }

    async function loadWorkspace() {
      setStatusMessage(null);
      clearAllPendingWorkspaceSaveTimers();

      const cached = workspaceWarmCacheRef.current.get(selectedDateIso);
      if (cached && Date.now() - cached.storedAt < WORKSPACE_WARM_CACHE_MS) {
        workspaceWarmCacheRef.current.delete(selectedDateIso);
        if (cancelled) {
          return;
        }
        applyWorkspacePayload(cached.payload);
        setIsLoadingWorkspace(false);
        return;
      }

      setIsLoadingWorkspace(true);
      try {
        const response = await fetch(`/api/day-workspace?date=${encodeURIComponent(selectedDateIso)}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Unable to load selected day.");
        }
        const payload = (await response.json()) as DayWorkspacePayload;
        if (cancelled) {
          return;
        }
        workspaceWarmCacheRef.current.delete(selectedDateIso);
        applyWorkspacePayload(payload);
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
            invalidateWorkspaceWarmCache(selectedDateIso);
          } catch {
            setStatusMessage("Unable to save note right now.");
          } finally {
            delete pendingNoteSaveTimers.current[noteId];
          }
        })();
      }, 500);
    }
  }, [notes, isWorkspaceOpen, isLoadingWorkspace, selectedDateIso, invalidateWorkspaceWarmCache]);

  const cells = useMemo(() => buildMonthCells(visibleMonth), [visibleMonth]);
  const calendarSummaryForGrid = useMemo(() => {
    if (!isWorkspaceOpen || isLoadingWorkspace) {
      return calendarSummary;
    }
    return {
      todoUrgencyByDate: {
        ...calendarSummary.todoUrgencyByDate,
        [selectedDateIso]: summarizeOpenTodoUrgency(todos),
      },
      eventCountByDate: {
        ...calendarSummary.eventCountByDate,
        [selectedDateIso]: events.length,
      },
      noteCountByDate: {
        ...calendarSummary.noteCountByDate,
        [selectedDateIso]: notes.length,
      },
    };
  }, [
    calendarSummary,
    isWorkspaceOpen,
    isLoadingWorkspace,
    selectedDateIso,
    todos,
    events,
    notes,
  ]);
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
      invalidateWorkspaceWarmCache(selectedDateIso);
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
      invalidateWorkspaceWarmCache(selectedDateIso);
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
      invalidateWorkspaceWarmCache(selectedDateIso);
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
      invalidateWorkspaceWarmCache(selectedDateIso);
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
      invalidateWorkspaceWarmCache(selectedDateIso);
    } catch {
      setStatusMessage("Unable to remove event right now.");
    }
  }

  function applyWorkspaceRailDefaults(lg: boolean) {
    if (lg) {
      setIsEventsRailOpen(true);
      setIsTasksRailOpen(true);
      setIsNotesRailOpen(true);
    } else {
      setIsEventsRailOpen(false);
      setIsTasksRailOpen(false);
      setIsNotesRailOpen(false);
    }
  }

  function handleBackToCalendar() {
    setIsWorkspaceOpen(false);
    prevWorkspaceOpenRef.current = false;
  }

  function handleSelectDate(isoDate: string) {
    if (isLgViewport) {
      if (isoDate === selectedDateIso && isWorkspaceOpen) {
        setIsWorkspaceOpen(false);
        return;
      }
    } else if (isoDate === selectedDateIso && isWorkspaceOpen) {
      return;
    }
    setSelectedDateIso(isoDate);
    setIsWorkspaceOpen(true);
    const lg =
      typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
    applyWorkspaceRailDefaults(lg);
  }

  function handleGoToToday() {
    const now = new Date();
    setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    const iso = toIsoDate(now);
    setSelectedDateIso(iso);
    setIsWorkspaceOpen(true);
    const lg =
      typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
    applyWorkspaceRailDefaults(lg);
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
    invalidateWorkspaceWarmCache(selectedDateIso);
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
    invalidateWorkspaceWarmCache(selectedDateIso);
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
    invalidateWorkspaceWarmCache(selectedDateIso);
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
    invalidateWorkspaceWarmCache(selectedDateIso);
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
    invalidateWorkspaceWarmCache(selectedDateIso);
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
        <p className="mb-2 text-xs text-slate-500 lg:text-sm">Loading day workspace...</p>
      ) : null}
      {statusMessage ? <p className="mb-2 text-xs text-red-600 lg:text-sm">{statusMessage}</p> : null}

      <div className="flex w-full flex-col divide-y divide-slate-200">
        <WorkspaceRail
          label="Events"
          open={isEventsRailOpen}
          onToggle={() => setIsEventsRailOpen((v) => !v)}
        >
          <div className="space-y-2 lg:space-y-3">
            <button
              type="button"
              onClick={handleAddEvent}
              className="w-full rounded-md border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 lg:px-2.5 lg:py-1.5 lg:text-xs"
            >
              Add event
            </button>
            {events.length === 0 ? (
              <p className="text-xs leading-relaxed text-slate-500 lg:text-sm">
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
                      className="flex w-full items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50/60 px-2.5 py-2 text-left text-[13px] text-slate-900 transition hover:bg-slate-100 lg:gap-3 lg:rounded-lg lg:px-3 lg:py-2.5 lg:text-sm"
                    >
                      <span className="min-w-0 truncate font-medium">
                        {ev.title.trim() ? ev.title.trim() : "Untitled event"}
                      </span>
                      <span className="shrink-0 tabular-nums text-[11px] text-slate-500 lg:text-xs">
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
                  <div key={ev.id} className="rounded-md border border-slate-200 bg-slate-50/60 p-2.5 lg:rounded-lg lg:p-3">
                    <label className="block text-[11px] font-medium text-slate-600 lg:text-xs">Title</label>
                    <input
                      value={d.title}
                      onChange={(e) => updateEventDraft(ev.id, { title: e.target.value })}
                      maxLength={200}
                      placeholder="Event title"
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-[13px] text-slate-900 outline-none focus:border-slate-400 lg:py-1.5 lg:text-sm"
                    />
                    <label className="mt-2 block text-[11px] font-medium text-slate-600 lg:text-xs">What it is</label>
                    <textarea
                      value={d.description}
                      onChange={(e) => updateEventDraft(ev.id, { description: e.target.value })}
                      rows={2}
                      maxLength={500}
                      placeholder="Short descriptor"
                      className="mt-1 w-full resize-y rounded-md border border-slate-300 bg-white px-2 py-1 text-[13px] text-slate-900 outline-none focus:border-slate-400 lg:py-1.5 lg:text-sm"
                    />
                    <label className="mt-2 block text-[11px] font-medium text-slate-600 lg:text-xs">Time</label>
                    <input
                      type="time"
                      value={d.eventTime ?? ""}
                      onChange={(e) =>
                        updateEventDraft(ev.id, { eventTime: e.target.value ? e.target.value : null })
                      }
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-[13px] text-slate-900 outline-none focus:border-slate-400 lg:py-1.5 lg:text-sm"
                    />
                    <div className="mt-2 flex flex-wrap items-center justify-end gap-1.5 lg:mt-3 lg:gap-2">
                      <button
                        type="button"
                        onClick={() => closeEventEditor(ev.id)}
                        className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 lg:px-3 lg:py-1.5 lg:text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSaveEvent(ev.id)}
                        className="rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-slate-800 lg:px-3 lg:py-1.5 lg:text-xs"
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
            <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2.5 lg:mb-4 lg:rounded-lg lg:p-3">
              <p className="text-xs font-medium text-amber-900 lg:text-sm">Carry unfinished tasks forward?</p>
              <p className="mt-1 text-[11px] text-amber-800 lg:text-xs">
                {carryCandidates.length} unfinished task{carryCandidates.length > 1 ? "s" : ""} from yesterday.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCarryForward}
                  className="rounded-md border border-amber-300 px-2 py-1 text-[11px] text-amber-900 hover:bg-amber-100 lg:px-3 lg:py-1.5 lg:text-xs"
                >
                  Carry forward
                </button>
                <button
                  type="button"
                  onClick={handleDeclineCarryForward}
                  className="rounded-md border border-transparent px-2 py-1 text-[11px] text-amber-900 hover:underline lg:py-1.5 lg:text-xs"
                >
                  Not now
                </button>
              </div>
            </div>
          ) : null}

          <div className="space-y-1.5 lg:space-y-2">
            {sortedTodos.length === 0 ? (
              <p className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-500 lg:rounded-lg lg:px-3 lg:py-2 lg:text-sm">
                No tasks for this date yet
              </p>
            ) : (
              sortedTodos.map((todo) => (
                <div
                  key={todo.id}
                  className={`rounded-md border px-2.5 py-1.5 lg:rounded-lg lg:px-3 lg:py-2 ${urgencyRowClassName(todo.urgency)}`}
                >
                  <div className="flex min-w-0 flex-col gap-1.5 lg:flex-row lg:items-start lg:justify-between lg:gap-3">
                    <label className="flex min-w-0 items-start gap-1.5 text-[13px] text-slate-700 lg:gap-2 lg:text-sm">
                      <input
                        type="checkbox"
                        checked={todo.isComplete}
                        onChange={() => handleToggleTodo(todo.id, todo.isComplete)}
                        className="mt-0.5 shrink-0"
                      />
                      <span
                        className={`min-w-0 flex-1 break-words ${todo.isComplete ? "line-through text-slate-400" : ""}`}
                      >
                        {todo.content}
                      </span>
                    </label>
                    <div className="flex shrink-0 items-center justify-end gap-1.5 pl-5 lg:gap-2 lg:pl-0">
                      <UrgencySwatchPicker
                        value={todo.urgency}
                        onChange={(urgency) => void handleUpdateTodoUrgency(todo.id, urgency)}
                      />
                      <button
                        type="button"
                        onClick={() => void handleDeleteTodo(todo.id)}
                        className="shrink-0 px-1.5 py-1 text-[11px] leading-tight text-slate-500 hover:text-red-600 lg:min-h-0 lg:px-1 lg:text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-2 flex min-w-0 flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center lg:mt-3 lg:gap-2">
            <input
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              placeholder=""
              aria-label="New task"
              className="min-w-0 flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-[13px] text-slate-900 outline-none focus:border-slate-400 lg:rounded-lg lg:px-3 lg:py-2 lg:text-sm"
            />
            <div className="flex min-w-0 shrink-0 items-center justify-between gap-1.5 sm:justify-end lg:gap-2">
              <UrgencySwatchPicker value={newTodoUrgency} onChange={setNewTodoUrgency} compact />
              <button
                type="button"
                onClick={() => void handleAddTodo()}
                className="shrink-0 rounded-md bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-slate-800 lg:rounded-lg lg:px-4 lg:py-2 lg:text-sm"
              >
                Add
              </button>
            </div>
          </div>
        </WorkspaceRail>

        <WorkspaceRail label="Notes" open={isNotesRailOpen} onToggle={() => setIsNotesRailOpen((v) => !v)}>
          <div className="space-y-2 lg:space-y-3">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAddNote}
                className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 lg:px-2.5 lg:py-1.5 lg:text-xs"
              >
                Add comment
              </button>
            </div>
            {notes.length === 0 ? (
              <p className="text-xs leading-relaxed text-slate-500 lg:text-sm">
                No notes yet. Use &quot;Add comment&quot; for a separate note on this day.
              </p>
            ) : (
              <div className="space-y-2 lg:space-y-3">
                {notes.map((n) => (
                  <div key={n.id} className="rounded-md border border-slate-200 bg-slate-50/50 p-2.5 lg:rounded-lg lg:p-3">
                    <textarea
                      value={n.content}
                      onChange={(e) => handleNoteChange(n.id, e.target.value)}
                      placeholder=""
                      aria-label="Note"
                      rows={4}
                      className="w-full resize-y rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] text-slate-900 outline-none focus:border-slate-400 lg:px-3 lg:py-2 lg:text-sm"
                    />
                    <div className="mt-1.5 flex justify-end lg:mt-2">
                      <button
                        type="button"
                        onClick={() => void handleDeleteNote(n.id)}
                        className="text-[11px] text-slate-500 hover:text-red-600 lg:text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </WorkspaceRail>
      </div>
    </>
  );

  return (
    <section className="flex flex-col gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white lg:flex-row lg:items-start lg:gap-0 lg:overflow-visible">
      <div
        className={`flex flex-col rounded-xl border border-slate-200 bg-white p-3 sm:p-5 md:p-6 max-lg:rounded-none max-lg:border-0 lg:min-w-[22rem] lg:rounded-none lg:border-0 lg:border-r lg:border-slate-200 motion-safe:transition-[flex-grow,flex-basis,max-width] motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none lg:flex ${
          mobileShowsCalendar ? "max-lg:flex" : "max-lg:hidden"
        } ${
          isWorkspaceOpen ? "lg:max-w-[54%] lg:shrink-0 lg:flex-[1_1_54%]" : "lg:flex-1"
        }`}
      >
        <div
          className={`shrink-0 origin-top will-change-transform motion-safe:transition-[transform] motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
            isWorkspaceOpen ? "lg:scale-[0.985]" : "lg:scale-100"
          }`}
        >
        <div className="mb-3 flex min-w-0 flex-col gap-2 min-[400px]:mb-4 min-[400px]:flex-row min-[400px]:items-center min-[400px]:justify-between min-[400px]:gap-3">
          <h2 className="min-w-0 shrink text-base font-semibold tracking-tight text-slate-900 min-[400px]:text-lg lg:text-xl">
            {monthLabel}
          </h2>
          <div className="flex shrink-0 flex-wrap items-center justify-start gap-1.5 min-[400px]:justify-end min-[400px]:gap-2">
            <button
              type="button"
              onClick={handleGoToToday}
              aria-label="Go to today"
              className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-800 hover:bg-slate-50 min-[400px]:px-3 min-[400px]:py-1.5 min-[400px]:text-sm"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() =>
                setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
              }
              className="rounded-md border border-slate-300 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50 min-[400px]:px-3 min-[400px]:py-1.5 min-[400px]:text-sm"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() =>
                setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
              }
              className="rounded-md border border-slate-300 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50 min-[400px]:px-3 min-[400px]:py-1.5 min-[400px]:text-sm"
            >
              Next
            </button>
          </div>
        </div>

        <div className="mb-2 grid grid-cols-7 gap-px text-center text-[10px] font-medium uppercase tracking-wide text-slate-500 min-[400px]:gap-1 min-[400px]:text-xs">
          {WEEKDAY_LABELS.map((day, i) => (
            <div key={day} className="py-1 min-[400px]:py-2">
              <span className="min-[400px]:hidden">{WEEKDAY_LABELS_NARROW[i]}</span>
              <span className="hidden min-[400px]:inline">{day}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px items-start min-[400px]:gap-1">
          {cells.map((cell) => {
            const isSelected = cell.isoDate === selectedDateIso;
            const isToday = cell.isoDate === todayIso;
            const todoCounts = calendarSummaryForGrid.todoUrgencyByDate[cell.isoDate];
            const eventCount = calendarSummaryForGrid.eventCountByDate[cell.isoDate] ?? 0;
            const noteCount = calendarSummaryForGrid.noteCountByDate[cell.isoDate] ?? 0;

            const cellSurface = isSelected
              ? "border-slate-900 bg-slate-900 text-white focus-visible:ring-white/40 focus-visible:ring-offset-slate-900 motion-safe:hover:scale-[1.02] motion-safe:hover:shadow-lg"
              : cell.isCurrentMonth
                ? "border-slate-200 bg-white text-slate-800 hover:bg-slate-50 motion-safe:hover:scale-[1.04] motion-safe:hover:shadow-md"
                : "border-slate-100 bg-slate-50 text-slate-400 motion-safe:hover:scale-[1.03] motion-safe:hover:shadow";

            return (
              <button
                key={cell.isoDate}
                type="button"
                onClick={() => handleSelectDate(cell.isoDate)}
                onPointerEnter={() => scheduleWorkspacePrefetch(cell.isoDate)}
                onPointerLeave={() => cancelWorkspacePrefetch(cell.isoDate)}
                className={`relative z-0 grid w-full max-w-full touch-manipulation grid-rows-[auto_minmax(0,1fr)_auto] gap-0 rounded-md border px-1.5 py-1 text-left font-sans min-[400px]:gap-0.5 min-[400px]:px-1.5 min-[400px]:py-1 aspect-[3/4] min-h-0 transform-gpu min-[400px]:aspect-[5/4] motion-safe:transition-[transform,box-shadow,background-color,border-color,color] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:hover:z-10 motion-safe:active:scale-[0.93] motion-safe:active:shadow-sm motion-safe:active:duration-150 motion-reduce:transition-colors motion-reduce:duration-200 motion-reduce:hover:scale-100 motion-reduce:active:scale-100 focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/90 focus-visible:ring-offset-2 ${cellSurface}`}
              >
                <div className="grid min-h-[1rem] w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-0.5">
                  <CalendarDayCornerContentIndicators
                    eventCount={eventCount}
                    noteCount={noteCount}
                    selected={isSelected}
                  />
                  {isToday ? (
                    <span
                      className={`mt-0.5 h-1 w-1 shrink-0 justify-self-end rounded-full min-[400px]:h-1.5 min-[400px]:w-1.5 ${
                        isSelected ? "bg-white/80" : "bg-slate-900"
                      }`}
                      aria-hidden
                    />
                  ) : null}
                </div>
                <span className="flex min-h-0 min-w-0 items-center justify-center self-stretch text-center text-[10px] font-medium tabular-nums leading-none tracking-tight text-inherit min-[400px]:text-xs sm:text-sm">
                  {cell.dayNumber}
                </span>
                <div className="flex min-h-[0.875rem] w-full min-w-0 justify-center px-0.5 pb-0.5 pt-px min-[400px]:px-1">
                  <CalendarDayTodoIndicators counts={todoCounts} selected={isSelected} />
                </div>
              </button>
            );
          })}
        </div>
        </div>
      </div>

      <div
        ref={mobileWorkspaceSectionRef}
        className={`flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white max-lg:rounded-none max-lg:border-0 max-lg:border-t max-lg:border-slate-200 lg:rounded-none lg:border-0 lg:border-l lg:border-slate-200 lg:transition-[width,flex-basis,max-width] lg:duration-500 lg:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:lg:transition-none ${
          mobileShowsCalendar ? "max-lg:hidden" : "max-lg:flex max-lg:min-h-0 max-lg:w-full max-lg:flex-1"
        } ${
          isWorkspaceOpen
            ? "lg:flex-[0_0_46%] lg:max-w-[46%] lg:min-w-0 lg:overflow-visible"
            : "lg:max-w-0 lg:w-0 lg:shrink-0 lg:overflow-hidden"
        } ${isWorkspaceOpen ? "lg:border-l" : "lg:border-l-0"} lg:flex`}
      >
        <div className="flex w-full min-w-0 flex-col">
          {!mobileShowsCalendar ? (
            <div className="flex min-w-0 items-center gap-2 border-b border-slate-200 px-3 py-2.5 lg:hidden">
              <button
                type="button"
                onClick={handleBackToCalendar}
                aria-label="Back to calendar"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:bg-slate-50 active:bg-slate-100"
              >
                <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none">
                  <path
                    d="M15 18l-6-6 6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Selected day</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">{selectedDateLabel}</p>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            aria-expanded={isWorkspaceOpen}
            onClick={() => setIsWorkspaceOpen((prev) => !prev)}
            className="hidden w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-slate-50 sm:px-6 lg:flex lg:shrink-0 lg:py-4"
          >
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Selected day</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{selectedDateLabel}</p>
            </div>
            <span className="flex items-center gap-2 text-sm text-slate-600">
              <span>{isWorkspaceOpen ? "Close panel" : "Open panel"}</span>
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
            className={`flex min-h-0 flex-col border-t border-slate-200 px-3.5 py-3 sm:px-5 sm:py-5 lg:px-4 lg:py-4 ${
              mobileShowsCalendar ? "max-lg:hidden" : "max-lg:flex max-lg:min-h-0 max-lg:flex-1 max-lg:overflow-y-auto"
            } ${
              isWorkspaceOpen ? "lg:opacity-100" : "lg:pointer-events-none lg:opacity-0"
            } transition-opacity duration-200 ease-out motion-reduce:transition-none`}
          >
            {workspaceRailsInner}
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

  const targetLength = getCalendarGridCellCount(year, month + 1);
  while (cells.length < targetLength) {
    const dayNumber = cells.length - (firstDayIndex + daysInMonth) + 1;
    const date = new Date(year, month + 1, dayNumber);
    cells.push({ isoDate: toIsoDate(date), dayNumber, isCurrentMonth: false });
  }

  return cells;
}
