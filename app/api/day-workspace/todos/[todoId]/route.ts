import { NextResponse } from "next/server";

import { deleteTodo, updateTodo } from "@/lib/daydeck/todos";
import type { TodoUrgency } from "@/types/daydeck";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ todoId: string }> },
) {
  try {
    const { todoId } = await params;
    const payload = (await request.json()) as {
      content?: string;
      isComplete?: boolean;
      urgency?: TodoUrgency;
    };
    const updates: { content?: string; is_complete?: boolean; urgency?: TodoUrgency } = {};

    if (typeof payload.content === "string") {
      updates.content = payload.content.trim();
    }
    if (typeof payload.isComplete === "boolean") {
      updates.is_complete = payload.isComplete;
    }
    if (typeof payload.urgency === "string") {
      if (!["urgent", "moderate", "not_urgent"].includes(payload.urgency)) {
        return NextResponse.json({ error: "Invalid urgency value." }, { status: 400 });
      }
      updates.urgency = payload.urgency;
    }

    const todo = await updateTodo(todoId, updates);
    return NextResponse.json({ todo });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update todo.";
    const status = /authenticated/i.test(message) ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ todoId: string }> },
) {
  try {
    const { todoId } = await params;
    await deleteTodo(todoId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete todo.";
    const status = /authenticated/i.test(message) ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
