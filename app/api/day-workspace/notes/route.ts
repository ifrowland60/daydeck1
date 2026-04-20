import { NextResponse } from "next/server";

import { getOrCreateDay } from "@/lib/daydeck/days";
import { createNote } from "@/lib/daydeck/notes";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { date?: string; content?: string };
    const date = payload.date;
    const content = payload.content ?? "";

    if (!date) {
      return NextResponse.json({ error: "Missing date." }, { status: 400 });
    }

    const day = await getOrCreateDay(date);
    const note = await createNote(day.id, content);

    return NextResponse.json({ note });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create note.";
    const status = /authenticated/i.test(message) ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
