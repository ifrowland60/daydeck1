import { NextResponse } from "next/server";

import { getDayWorkspaceBundle } from "@/lib/daydeck/day-workspace";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date) {
    return NextResponse.json({ error: "Missing date query." }, { status: 400 });
  }

  try {
    const { dayId, notes, events, todos, carryCandidates } = await getDayWorkspaceBundle(date);
    const alreadyCarried = new Set(
      todos
        .filter((todo) => todo.carriedFromTodoId)
        .map((todo) => todo.carriedFromTodoId as string),
    );
    const availableCarryCandidates = carryCandidates.filter(
      (candidate) => !alreadyCarried.has(candidate.id),
    );

    return NextResponse.json({
      dayId,
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
