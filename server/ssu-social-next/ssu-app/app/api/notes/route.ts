import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/utilities/cors";
import sql from "@/utilities/db";

export async function OPTIONS() {
  console.log(" OPTIONS /api/notes/[id] HIT");

  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// GET /api/notes?user_id=<uuid>&lessonId=<uuid> (lessonId optional)
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("user_id");
    const lessonId = req.nextUrl.searchParams.get("lessonId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required query parameter: user_id" },
        { status: 400, headers: corsHeaders }
      );
    }

    const rows = lessonId
      ? await sql`
          SELECT
            n.note_id,
            n.user_id,
            n.lesson_id,
            n.content,
            n.created_at,
            n.updated_at,
            l.title AS lesson_title
          FROM dm_notes n
          LEFT JOIN dm_lessons l ON l.lesson_id = n.lesson_id
          WHERE n.user_id = ${userId}
            AND n.lesson_id = ${lessonId}
          ORDER BY n.updated_at DESC
        `
      : await sql`
          SELECT
            n.note_id,
            n.user_id,
            n.lesson_id,
            n.content,
            n.created_at,
            n.updated_at,
            l.title AS lesson_title
          FROM dm_notes n
          LEFT JOIN dm_lessons l ON l.lesson_id = n.lesson_id
          WHERE n.user_id = ${userId}
          ORDER BY n.updated_at DESC
        `;

    return NextResponse.json(
      { items: rows },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST /api/notes
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lesson_id, user_id, content } = body;

    if (!lesson_id || !user_id || !content?.trim()) {
      return NextResponse.json(
        { error: "lesson_id, user_id and content are required." },
        { status: 400, headers: corsHeaders }
      );
    }

    const inserted = await sql`
      INSERT INTO dm_notes (lesson_id, user_id, content)
      VALUES (${lesson_id}, ${user_id}, ${content.trim()})
      RETURNING
        note_id,
        user_id,
        lesson_id,
        content,
        created_at,
        updated_at
    `;

    return NextResponse.json(
      { note: inserted[0] },
      { status: 201, headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 500, headers: corsHeaders }
    );
  }
}