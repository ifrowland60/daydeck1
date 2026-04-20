import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { mapDayEvent } from "@/lib/daydeck/mappers";
import type { DayEvent, DayEventRow } from "@/types/daydeck";

export async function getEventsByDayId(dayId: string): Promise<DayEvent[]> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("day_events")
    .select("*")
    .eq("day_id", dayId)
    .order("created_at", { ascending: true })
    .returns<DayEventRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapDayEvent);
}

export async function createDayEvent(
  dayId: string,
  fields: { title?: string; description?: string; eventTime?: string | null },
): Promise<DayEvent> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("day_events")
    .insert({
      day_id: dayId,
      title: fields.title ?? "",
      description: fields.description ?? "",
      event_time: normalizeTimeForDb(fields.eventTime),
    })
    .select("*")
    .single<DayEventRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapDayEvent(data);
}

export async function updateDayEvent(
  eventId: string,
  updates: Partial<{ title: string; description: string; eventTime: string | null }>,
): Promise<DayEvent> {
  const row: Record<string, unknown> = {};
  if (typeof updates.title === "string") {
    row.title = updates.title;
  }
  if (typeof updates.description === "string") {
    row.description = updates.description;
  }
  if ("eventTime" in updates) {
    row.event_time = normalizeTimeForDb(updates.eventTime);
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("day_events")
    .update(row)
    .eq("id", eventId)
    .select("*")
    .single<DayEventRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapDayEvent(data);
}

export async function deleteDayEvent(eventId: string) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("day_events").delete().eq("id", eventId);

  if (error) {
    throw new Error(error.message);
  }
}

function normalizeTimeForDb(value: string | null | undefined): string | null {
  if (value == null || String(value).trim() === "") {
    return null;
  }
  const s = String(value).trim();
  if (s.length === 5) {
    return `${s}:00`;
  }
  return s;
}
