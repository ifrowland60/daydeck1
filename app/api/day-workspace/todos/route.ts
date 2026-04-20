import { NextResponse } from "next/server";

import { getOrCreateDay } from "@/lib/daydeck/days";
import { createTodo } from "@/lib/daydeck/todos";
import type { TodoUrgency } from "@/types/daydeck";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { date?: string; content?: string; urgency?: TodoUrgency };
    const date = payload.date;
    const content = (payload.content ?? "").trim();
    const urgency = payload.urgency ?? "moderate";

    if (!date || !content) {
      return NextResponse.json({ error: "Missing date or todo content." }, { status: 400 });
    }
    if (!["urgent", "moderate", "not_urgent"].includes(urgency)) {
      return NextResponse.json({ error: "Invalid urgency value." }, { status: 400 });
    }

    const day = await getOrCreateDay(date);
    const todo = await createTodo(day.id, content, urgency);

    return NextResponse.json({ todo });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create todo.";
    const status = /authenticated/i.test(message) ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
