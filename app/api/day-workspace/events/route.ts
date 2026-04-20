import { NextResponse } from "next/server";

import { getOrCreateDay } from "@/lib/daydeck/days";
import { createDayEvent } from "@/lib/daydeck/events";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      date?: string;
      title?: string;
      description?: string;
      eventTime?: string | null;
    };
    const date = payload.date;

    if (!date) {
      return NextResponse.json({ error: "Missing date." }, { status: 400 });
    }

    const day = await getOrCreateDay(date);
    const event = await createDayEvent(day.id, {
      title: payload.title,
      description: payload.description,
      eventTime: payload.eventTime,
    });

    return NextResponse.json({ event });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create event.";
    const status = /authenticated/i.test(message) ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
