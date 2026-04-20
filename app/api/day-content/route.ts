import { NextResponse } from "next/server";

import { getTodoUrgencyCountsByDateForCalendarMonth } from "@/lib/daydeck/days";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid year/month query." }, { status: 400 });
  }

  try {
    const todoUrgencyByDate = await getTodoUrgencyCountsByDateForCalendarMonth(year, month);
    return NextResponse.json({ todoUrgencyByDate });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load day content.";
    const status = /authenticated/i.test(message) ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
