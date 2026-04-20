import { NextResponse } from "next/server";

import { deleteNote, updateNote } from "@/lib/daydeck/notes";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ noteId: string }> },
) {
  try {
    const { noteId } = await params;
    const payload = (await request.json()) as { content?: string };
    const content = payload.content ?? "";

    const note = await updateNote(noteId, content);
    return NextResponse.json({ note });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update note.";
    const status = /authenticated/i.test(message) ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ noteId: string }> },
) {
  try {
    const { noteId } = await params;
    await deleteNote(noteId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete note.";
    const status = /authenticated/i.test(message) ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
