import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/utilities/cors";
import sql from "@/utilities/db";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

function getNoteId(req: NextRequest): string | null {
  const segments = req.nextUrl.pathname.split("/");
  return segments[segments.length - 1] || null;
}

// PATCH /api/notes/[id]
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, content } = body;

    if (!user_id || !content?.trim()) {
      return NextResponse.json(
        { error: "user_id and content are both required." },
        { status: 400, headers: corsHeaders }
      );
    }

    const noteId = getNoteId(req);
    if (!noteId) {
      return NextResponse.json(
        { error: "Missing note ID in the request path." },
        { status: 400, headers: corsHeaders }
      );
    }

    const existing = await sql`
      SELECT note_id, user_id
      FROM dm_notes
      WHERE note_id = ${noteId}
      LIMIT 1
    `;

    if (!existing.length) {
      return NextResponse.json(
        { error: "Note not found." },
        { status: 404, headers: corsHeaders }
      );
    }

    if (existing[0].user_id !== user_id) {
      return NextResponse.json(
        { error: "You are not authorized to edit this note." },
        { status: 403, headers: corsHeaders }
      );
    }

    const updated = await sql`
      UPDATE dm_notes n
      SET content = ${content.trim()},
          updated_at = NOW()
      WHERE n.note_id = ${noteId}
      RETURNING
        n.note_id,
        n.user_id,
        n.lesson_id,
        n.content,
        n.created_at,
        n.updated_at
    `;

    const note = updated[0];

    const lessonRows = await sql`
      SELECT title
      FROM dm_lessons
      WHERE lesson_id = ${note.lesson_id}
      LIMIT 1
    `;

    return NextResponse.json(
      {
        note: {
          ...note,
          lesson_title: lessonRows[0]?.title || null,
        },
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 500, headers: corsHeaders }
    );
  }
}

// DELETE /api/notes/[id]
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: "user_id is required." },
        { status: 400, headers: corsHeaders }
      );
    }

    const noteId = getNoteId(req);
    if (!noteId) {
      return NextResponse.json(
        { error: "Missing note ID in the request path." },
        { status: 400, headers: corsHeaders }
      );
    }

    const existing = await sql`
      SELECT note_id, user_id
      FROM dm_notes
      WHERE note_id = ${noteId}
      LIMIT 1
    `;

    if (!existing.length) {
      return NextResponse.json(
        { error: "Note not found." },
        { status: 404, headers: corsHeaders }
      );
    }

    if (existing[0].user_id !== user_id) {
      return NextResponse.json(
        { error: "You are not authorized to delete this note." },
        { status: 403, headers: corsHeaders }
      );
    }

    await sql`
      DELETE FROM dm_notes
      WHERE note_id = ${noteId}
    `;

    return NextResponse.json(
      { message: "Note deleted successfully." },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 500, headers: corsHeaders }
    );
  }
}