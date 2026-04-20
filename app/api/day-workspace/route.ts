import { NextResponse } from "next/server";

import { getCarryForwardCandidates } from "@/lib/daydeck/carry-forward";
import { getDayByDate } from "@/lib/daydeck/days";
import { getEventsByDayId } from "@/lib/daydeck/events";
import { getNotesByDayId } from "@/lib/daydeck/notes";
import { getTodosByDayId } from "@/lib/daydeck/todos";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date) {
    return NextResponse.json({ error: "Missing date query." }, { status: 400 });
  }

  try {
    const day = await getDayByDate(date);
    const notes = day ? await getNotesByDayId(day.id) : [];
    const events = day ? await getEventsByDayId(day.id) : [];
    const todos = day ? await getTodosByDayId(day.id) : [];
    const carryCandidates = await getCarryForwardCandidates(date);
    const alreadyCarried = new Set(
      todos
        .filter((todo) => todo.carriedFromTodoId)
        .map((todo) => todo.carriedFromTodoId as string),
    );
    const availableCarryCandidates = carryCandidates.filter(
      (candidate) => !alreadyCarried.has(candidate.id),
    );

    return NextResponse.json({
      dayId: day?.id ?? null,
      notes,
      events,
      todos,
      carryCandidates: availableCarryCandidates,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load workspace.";
    const status = /authenticated/i.test(message) ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
