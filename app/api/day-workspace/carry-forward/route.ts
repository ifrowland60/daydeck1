import { NextResponse } from "next/server";

import { carryForwardTodos, getCarryForwardCandidates } from "@/lib/daydeck/carry-forward";
import { getOrCreateDay } from "@/lib/daydeck/days";
import { getTodosByDayId } from "@/lib/daydeck/todos";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { date?: string };
    const date = payload.date;

    if (!date) {
      return NextResponse.json({ error: "Missing date." }, { status: 400 });
    }

    const day = await getOrCreateDay(date);
    const currentTodos = await getTodosByDayId(day.id);
    const existingCarried = new Set(
      currentTodos
        .filter((todo) => todo.carriedFromTodoId)
        .map((todo) => todo.carriedFromTodoId as string),
    );
    const candidates = (await getCarryForwardCandidates(date)).filter(
      (candidate) => !existingCarried.has(candidate.id),
    );

    const carried = await carryForwardTodos(day.id, candidates);
    return NextResponse.json({ todos: carried });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to carry tasks forward.";
    const status = /authenticated/i.test(message) ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
