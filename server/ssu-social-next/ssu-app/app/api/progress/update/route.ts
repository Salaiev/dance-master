import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/utilities/cors";
import sql from "@/utilities/db";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// POST /api/progress/update
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      user_id,
      lesson_id,
      last_position_sec = 0,
      time_spent_sec = 0,
      video_completed = false,
      instructions_completed = false,
    } = body;

    if (!user_id || !lesson_id) {
      return NextResponse.json(
        { error: "user_id and lesson_id are required." },
        { status: 400, headers: corsHeaders }
      );
    }

    const safeLastPosition = Math.max(0, Number(last_position_sec) || 0);
    const safeTimeSpent = Math.max(0, Number(time_spent_sec) || 0);
    const safeVideoCompleted = Boolean(video_completed);
    const safeInstructionsCompleted = Boolean(instructions_completed);

    const user = await sql`
      SELECT user_id
      FROM ssu_users
      WHERE user_id = ${user_id}
      LIMIT 1
    `;

    if (!user.length) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404, headers: corsHeaders }
      );
    }

    const lesson = await sql`
      SELECT lesson_id
      FROM dm_lessons
      WHERE lesson_id = ${lesson_id}
      LIMIT 1
    `;

    if (!lesson.length) {
      return NextResponse.json(
        { error: "Lesson not found." },
        { status: 404, headers: corsHeaders }
      );
    }

    const existing = await sql`
      SELECT *
      FROM dm_progress
      WHERE user_id = ${user_id}
        AND lesson_id = ${lesson_id}
      LIMIT 1
    `;

    let result;

    if (!existing.length) {
      const isCompleted = safeVideoCompleted && safeInstructionsCompleted;

      const status = isCompleted
        ? "COMPLETED"
        : safeVideoCompleted ||
          safeInstructionsCompleted ||
          safeTimeSpent > 0 ||
          safeLastPosition > 0
        ? "IN_PROGRESS"
        : "NOT_STARTED";

      result = await sql`
        INSERT INTO dm_progress (
          user_id,
          lesson_id,
          last_position_sec,
          time_spent_sec,
          video_completed,
          instructions_completed,
          is_completed,
          status,
          completed_at,
          last_accessed_at,
          updated_at
        )
        VALUES (
          ${user_id},
          ${lesson_id},
          ${safeLastPosition},
          ${safeTimeSpent},
          ${safeVideoCompleted},
          ${safeInstructionsCompleted},
          ${isCompleted},
          ${status},
          CASE WHEN ${isCompleted} THEN NOW() ELSE NULL END,
          NOW(),
          NOW()
        )
        RETURNING *
      `;
    } else {
      const old = existing[0];

      const mergedLastPosition = Math.max(
        Number(old.last_position_sec) || 0,
        safeLastPosition
      );

      const mergedTimeSpent =
        Math.max(0, Number(old.time_spent_sec) || 0) + safeTimeSpent;

      const mergedVideoCompleted =
        Boolean(old.video_completed) || safeVideoCompleted;

      const mergedInstructionsCompleted =
        Boolean(old.instructions_completed) || safeInstructionsCompleted;

      const nextIsCompleted =
        Boolean(old.is_completed) ||
        (mergedVideoCompleted && mergedInstructionsCompleted);

      const nextStatus = nextIsCompleted
        ? "COMPLETED"
        : mergedVideoCompleted ||
          mergedInstructionsCompleted ||
          mergedTimeSpent > 0 ||
          mergedLastPosition > 0
        ? "IN_PROGRESS"
        : "NOT_STARTED";

      result = await sql`
        UPDATE dm_progress
        SET
          last_position_sec = ${mergedLastPosition},
          time_spent_sec = ${mergedTimeSpent},
          video_completed = ${mergedVideoCompleted},
          instructions_completed = ${mergedInstructionsCompleted},
          is_completed = ${nextIsCompleted},
          status = ${nextStatus},
          completed_at = CASE
            WHEN ${nextIsCompleted} AND completed_at IS NULL THEN NOW()
            ELSE completed_at
          END,
          last_accessed_at = NOW(),
          updated_at = NOW()
        WHERE user_id = ${user_id}
          AND lesson_id = ${lesson_id}
        RETURNING *
      `;
    }

    return NextResponse.json(
      {
        message: "Progress updated successfully.",
        progress: result[0],
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("Error in POST /api/progress/update:", err);

    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 500, headers: corsHeaders }
    );
  }
}