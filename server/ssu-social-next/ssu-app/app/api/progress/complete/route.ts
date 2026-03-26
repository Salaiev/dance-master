import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/utilities/cors";
import sql from "@/utilities/db";

// POST /api/progress/complete
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      user_id,
      lesson_id,
      self_rating = null,
    } = body;

    if (!user_id || !lesson_id) {
      return NextResponse.json(
        { error: "user_id and lesson_id are required." },
        { status: 400, headers: corsHeaders }
      );
    }

    const user = await sql`
      SELECT user_id, username
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
      SELECT
        lesson_id,
        title,
        style,
        difficulty,
        duration_sec,
        video_url,
        description
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

    const progressRows = await sql`
      SELECT *
      FROM dm_progress
      WHERE user_id = ${user_id}
        AND lesson_id = ${lesson_id}
      LIMIT 1
    `;

    if (!progressRows.length) {
      return NextResponse.json(
        { error: "Progress row not found. Update progress first." },
        { status: 404, headers: corsHeaders }
      );
    }

    const progress = progressRows[0];

    if (!progress.video_completed || !progress.instructions_completed) {
      return NextResponse.json(
        {
          error: "Lesson cannot be completed until video and instructions are both completed.",
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const updatedProgress = await sql`
      UPDATE dm_progress
      SET
        is_completed = TRUE,
        status = 'COMPLETED',
        completed_at = COALESCE(completed_at, NOW()),
        last_accessed_at = NOW()
      WHERE user_id = ${user_id}
        AND lesson_id = ${lesson_id}
      RETURNING *
    `;

    const notesCountRows = await sql`
      SELECT COUNT(*)::int AS count
      FROM dm_notes
      WHERE user_id = ${user_id}
        AND lesson_id = ${lesson_id}
    `;

    const notesCount = notesCountRows[0]?.count ?? 0;
    const timeSpentSec = updatedProgress[0]?.time_spent_sec ?? 0;

    const summaryParts: string[] = [];
    summaryParts.push(`You completed "${lesson[0].title}".`);
    summaryParts.push(`Total time spent: ${Math.ceil(timeSpentSec / 60)} minute(s).`);
    summaryParts.push(`Video completed: Yes.`);
    summaryParts.push(`Instructions completed: Yes.`);
    summaryParts.push(`Notes created: ${notesCount}.`);

    if (self_rating !== null && self_rating !== undefined) {
      summaryParts.push(`Self-rating: ${self_rating}/5.`);
    }

    const summary = summaryParts.join(" ");

    const existingReport = await sql`
      SELECT report_id
      FROM dm_lesson_reports
      WHERE user_id = ${user_id}
        AND lesson_id = ${lesson_id}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    let report;

    if (!existingReport.length) {
      const inserted = await sql`
        INSERT INTO dm_lesson_reports (
          user_id,
          lesson_id,
          time_spent_sec,
          video_completed,
          instructions_completed,
          notes_count,
          self_rating,
          summary
        )
        VALUES (
          ${user_id},
          ${lesson_id},
          ${timeSpentSec},
          TRUE,
          TRUE,
          ${notesCount},
          ${self_rating !== null && self_rating !== undefined ? Number(self_rating) : null},
          ${summary}
        )
        RETURNING *
      `;
      report = inserted[0];
    } else {
      const updated = await sql`
        UPDATE dm_lesson_reports
        SET
          time_spent_sec = ${timeSpentSec},
          video_completed = TRUE,
          instructions_completed = TRUE,
          notes_count = ${notesCount},
          self_rating = ${self_rating !== null && self_rating !== undefined ? Number(self_rating) : null},
          summary = ${summary}
        WHERE report_id = ${existingReport[0].report_id}
        RETURNING *
      `;
      report = updated[0];
    }

    return NextResponse.json(
      {
        message: "Lesson completed successfully.",
        progress: updatedProgress[0],
        report,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("Error in POST /api/progress/complete:", err);

    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 500, headers: corsHeaders }
    );
  }
}