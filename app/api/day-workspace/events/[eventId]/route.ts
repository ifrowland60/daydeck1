import { NextResponse } from "next/server";

import { deleteDayEvent, updateDayEvent } from "@/lib/daydeck/events";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await params;
    const payload = (await request.json()) as {
      title?: string;
      description?: string;
      eventTime?: string | null;
    };
    const updates: Partial<{ title: string; description: string; eventTime: string | null }> = {};
    if (typeof payload.title === "string") {
      updates.title = payload.title;
    }
    if (typeof payload.description === "string") {
      updates.description = payload.description;
    }
    if ("eventTime" in payload) {
      updates.eventTime = payload.eventTime ?? null;
    }

    const event = await updateDayEvent(eventId, updates);
    return NextResponse.json({ event });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update event.";
    const status = /authenticated/i.test(message) ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await params;
    await deleteDayEvent(eventId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete event.";
    const status = /authenticated/i.test(message) ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
