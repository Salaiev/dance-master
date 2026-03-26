import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/utilities/cors";
import sql from "@/utilities/db";

// GET /api/progress?user_id=<uuid>
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required query parameter: user_id" },
        { status: 400, headers: corsHeaders }
      );
    }

    // user exists?
    const user = await sql`
      SELECT user_id
      FROM ssu_users
      WHERE user_id = ${userId}
      LIMIT 1
    `;

    if (!user.length) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404, headers: corsHeaders }
      );
    }

    const items = await sql`
      SELECT
        l.lesson_id,
        l.title,
        l.style,
        l.difficulty,
        l.duration_sec,
        l.video_url,
        l.description,

        p.last_position_sec,
        p.is_completed,
        p.status,
        p.time_spent_sec,
        p.video_completed,
        p.instructions_completed,
        p.completed_at,
        p.last_accessed_at,
        p.created_at,
        p.updated_at

      FROM dm_progress p
      JOIN dm_lessons l
        ON l.lesson_id = p.lesson_id
      WHERE p.user_id = ${userId}
      ORDER BY
        CASE
          WHEN p.status = 'COMPLETED' THEN 2
          WHEN p.status = 'IN_PROGRESS' THEN 1
          ELSE 0
        END DESC,
        p.updated_at DESC
    `;

    return NextResponse.json(
      { items },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("Error in GET /api/progress:", err);

    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 500, headers: corsHeaders }
    );
  }
}