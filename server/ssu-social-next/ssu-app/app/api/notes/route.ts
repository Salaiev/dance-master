import { NextResponse } from "next/server";
import sql from "@/utilities/db";

function getUserId(req: Request): string {
  // For now use header; later replace with real auth
  return req.headers.get("x-user-id") || "11111111-1111-1111-1111-111111111111";
}

export async function GET(req: Request) {
  try {
    const userId = getUserId(req);
    const url = new URL(req.url);
    const lessonId = url.searchParams.get("lessonId"); // optional filter

    let rows;

    if (lessonId) {
      rows = await sql`
        SELECT
          note_id,
          user_id,
          lesson_id,
          content,
          created_at,
          updated_at
        FROM dm_notes
        WHERE user_id = ${userId}
          AND lesson_id = ${lessonId}
        ORDER BY updated_at DESC
      `;
    } else {
      rows = await sql`
        SELECT
          note_id,
          user_id,
          lesson_id,
          content,
          created_at,
          updated_at
        FROM dm_notes
        WHERE user_id = ${userId}
        ORDER BY updated_at DESC
      `;
    }

    return NextResponse.json({ userId, items: rows });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to fetch notes" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const userId = getUserId(req);
    const body = await req.json().catch(() => ({} as any));

    const lessonId = typeof body.lessonId === "string" ? body.lessonId.trim() : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";

    if (!lessonId) {
      return NextResponse.json({ error: "lessonId is required" }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const rows = await sql`
      INSERT INTO dm_notes (user_id, lesson_id, content)
      VALUES (${userId}, ${lessonId}, ${content})
      RETURNING
        note_id,
        user_id,
        lesson_id,
        content,
        created_at,
        updated_at;
    `;

    return NextResponse.json(rows[0], { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to create note" },
      { status: 500 }
    );
  }
}