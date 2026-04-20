import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { mapNote } from "@/lib/daydeck/mappers";
import type { Note, NoteRow } from "@/types/daydeck";

export async function getNotesByDayId(dayId: string): Promise<Note[]> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("day_id", dayId)
    .order("created_at", { ascending: true })
    .returns<NoteRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapNote);
}

export async function createNote(dayId: string, content: string): Promise<Note> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("notes")
    .insert({ day_id: dayId, content })
    .select("*")
    .single<NoteRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapNote(data);
}

export async function updateNote(noteId: string, content: string): Promise<Note> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("notes")
    .update({ content })
    .eq("id", noteId)
    .select("*")
    .single<NoteRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapNote(data);
}

export async function deleteNote(noteId: string) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("notes").delete().eq("id", noteId);

  if (error) {
    throw new Error(error.message);
  }
}
