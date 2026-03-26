import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/utilities/cors";
import sql from "@/utilities/db";

type Params = {
  params: {
    lessonId: string;
  };
};

// GET /api/progress/[lessonId]?user_id=<uuid>
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const userId = req.nextUrl.searchParams.get("user_id");
    const lessonId = params.lessonId;

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required query parameter: user_id" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!lessonId) {
      return NextResponse.json(
        { error: "Missing lessonId." },
        { status: 400, headers: corsHeaders }
      );
    }

    const lesson = await sql`
      SELECT
        lesson_id,
        title,
        style,
        difficulty,
        duration_sec,
        video_url,
        description
      FROM dm_lessons
      WHERE lesson_id = ${lessonId}
      LIMIT 1
    `;

    if (!lesson.length) {
      return NextResponse.json(
        { error: "Lesson not found." },
        { status: 404, headers: corsHeaders }
      );
    }

    const progress = await sql`
      SELECT
        user_id,
        lesson_id,
        last_position_sec,
        is_completed,
        status,
        time_spent_sec,
        video_completed,
        instructions_completed,
        completed_at,
        last_accessed_at,
        created_at,
        updated_at
      FROM dm_progress
      WHERE user_id = ${userId}
        AND lesson_id = ${lessonId}
      LIMIT 1
    `;

    return NextResponse.json(
      {
        lesson: lesson[0],
        progress: progress.length
          ? progress[0]
          : {
              user_id: userId,
              lesson_id: lessonId,
              last_position_sec: 0,
              is_completed: false,
              status: "NOT_STARTED",
              time_spent_sec: 0,
              video_completed: false,
              instructions_completed: false,
              completed_at: null,
              last_accessed_at: null,
              created_at: null,
              updated_at: null,
            },
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("Error in GET /api/progress/[lessonId]:", err);

    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 500, headers: corsHeaders }
    );
  }
}