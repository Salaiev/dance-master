import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/utilities/cors";
import sql from "@/utilities/db";

// GET /api/progress/summary?user_id=<uuid>
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required query parameter: user_id" },
        { status: 400, headers: corsHeaders }
      );
    }

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

    const progressStats = await sql`
      SELECT
        COUNT(*)::int AS total_started,
        COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed_lessons,
        COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')::int AS in_progress_lessons,
        COUNT(*) FILTER (WHERE status = 'NOT_STARTED')::int AS not_started_lessons,
        COALESCE(SUM(time_spent_sec), 0)::int AS total_time_spent_sec,
        MAX(completed_at) AS last_completed_at
      FROM dm_progress
      WHERE user_id = ${userId}
    `;

    const todayStats = await sql`
      SELECT
        COALESCE(SUM(time_spent_sec), 0)::int AS today_time_spent_sec
      FROM dm_progress
      WHERE user_id = ${userId}
        AND last_accessed_at::date = CURRENT_DATE
    `;

    const weekStats = await sql`
      SELECT
        COALESCE(SUM(time_spent_sec), 0)::int AS week_time_spent_sec
      FROM dm_progress
      WHERE user_id = ${userId}
        AND last_accessed_at >= date_trunc('week', CURRENT_DATE)
    `;

    const recentCompleted = await sql`
      SELECT
        p.lesson_id,
        l.title,
        l.style,
        l.difficulty,
        p.completed_at,
        p.time_spent_sec
      FROM dm_progress p
      JOIN dm_lessons l
        ON l.lesson_id = p.lesson_id
      WHERE p.user_id = ${userId}
        AND p.status = 'COMPLETED'
      ORDER BY p.completed_at DESC NULLS LAST
      LIMIT 5
    `;

    const row = progressStats[0] ?? {
      total_started: 0,
      completed_lessons: 0,
      in_progress_lessons: 0,
      not_started_lessons: 0,
      total_time_spent_sec: 0,
      last_completed_at: null,
    };

    return NextResponse.json(
      {
        summary: {
          total_started: row.total_started ?? 0,
          completed_lessons: row.completed_lessons ?? 0,
          in_progress_lessons: row.in_progress_lessons ?? 0,
          not_started_lessons: row.not_started_lessons ?? 0,

          total_time_spent_sec: row.total_time_spent_sec ?? 0,
          total_time_spent_min: Math.ceil(
            (row.total_time_spent_sec ?? 0) / 60
          ),

          today_time_spent_sec: todayStats[0]?.today_time_spent_sec ?? 0,
          today_time_spent_min: Math.ceil(
            (todayStats[0]?.today_time_spent_sec ?? 0) / 60
          ),

          week_time_spent_sec: weekStats[0]?.week_time_spent_sec ?? 0,
          week_time_spent_min: Math.ceil(
            (weekStats[0]?.week_time_spent_sec ?? 0) / 60
          ),

          last_completed_at: row.last_completed_at ?? null,
        },
        recent_completed: recentCompleted,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("Error in GET /api/progress/summary:", err);

    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 500, headers: corsHeaders }
    );
  }
}