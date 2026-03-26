import { NextResponse } from "next/server";
import sql from "@/utilities/db";

function getUserId(req: Request): string {
  return req.headers.get("x-user-id") || "11111111-1111-1111-1111-111111111111";
}

export async function GET(req: Request, ctx: { params: { id: string } }) {
  try {
    const userId = getUserId(req);
    const noteId = ctx.params.id;

    const rows = await sql`
      SELECT
        note_id,
        user_id,
        lesson_id,
        content,
        created_at,
        updated_at
      FROM dm_notes
      WHERE note_id = ${noteId}
        AND user_id = ${userId}
      LIMIT 1;
    `;

    const note = rows?.[0];
    if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });

    return NextResponse.json(note);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to fetch note" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  try {
    const userId = getUserId(req);
    const noteId = ctx.params.id;

    const body = await req.json().catch(() => ({} as any));
    const content = typeof body.content === "string" ? body.content.trim() : "";

    if (!content) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const rows = await sql`
      UPDATE dm_notes
      SET content = ${content}
      WHERE note_id = ${noteId}
        AND user_id = ${userId}
      RETURNING
        note_id,
        user_id,
        lesson_id,
        content,
        created_at,
        updated_at;
    `;

    const updated = rows?.[0];
    if (!updated) return NextResponse.json({ error: "Note not found" }, { status: 404 });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to update note" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  try {
    const userId = getUserId(req);
    const noteId = ctx.params.id;

    const rows = await sql`
      DELETE FROM dm_notes
      WHERE note_id = ${noteId}
        AND user_id = ${userId}
      RETURNING note_id;
    `;

    if (!rows?.[0]) return NextResponse.json({ error: "Note not found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to delete note" },
      { status: 500 }
    );
  }
}