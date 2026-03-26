import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/utilities/cors";
import sql from "@/utilities/db";

// GET /api/comments?lesson_id=<uuid>
export async function GET(req: NextRequest) {
  try {
    const lessonId = req.nextUrl.searchParams.get("lesson_id");
    if (!lessonId) {
      return NextResponse.json(
        { error: "Missing required query parameter: lesson_id" },
        { status: 400, headers: corsHeaders }
      );
    }

    const comments = await sql`
      SELECT
        c.comment_id,
        c.user_id,
        c.lesson_id,
        c.content,
        c.reply_id,
        c.created_at,
        c.updated_at,
        u.username
      FROM dm_comments c
      JOIN ssu_users u ON u.user_id = c.user_id
      WHERE c.lesson_id = ${lessonId}
        AND c.reply_id IS NULL
      ORDER BY c.created_at ASC
    `;

    const items = await Promise.all(
      comments.map(async (comment: any) => {
        const replies = await sql`
          SELECT
            r.comment_id,
            r.user_id,
            r.lesson_id,
            r.content,
            r.reply_id,
            r.created_at,
            r.updated_at,
            u.username
          FROM dm_comments r
          JOIN ssu_users u ON u.user_id = r.user_id
          WHERE r.reply_id = ${comment.comment_id}
          ORDER BY r.created_at ASC
        `;

        return { ...comment, replies };
      })
    );

    return NextResponse.json({ items }, { status: 200, headers: corsHeaders });
  } catch (err: any) {
    console.error("Error in GET /api/comments:", err);
    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST /api/comments
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lesson_id, user_id, content, reply_id } = body;

    if (!lesson_id || !user_id || !content?.trim()) {
      return NextResponse.json(
        { error: "lesson_id, user_id, and content are all required." },
        { status: 400, headers: corsHeaders }
      );
    }

    // lesson exists?
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

    // user exists?
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

    // parent exists?
    if (reply_id) {
      const parent = await sql`
        SELECT comment_id
        FROM dm_comments
        WHERE comment_id = ${reply_id}
        LIMIT 1
      `;
      if (!parent.length) {
        return NextResponse.json(
          { error: "Parent comment not found." },
          { status: 404, headers: corsHeaders }
        );
      }
    }

    const [newComment] = await sql`
      INSERT INTO dm_comments (lesson_id, user_id, content, reply_id)
      VALUES (${lesson_id}, ${user_id}, ${content.trim()}, ${reply_id ?? null})
      RETURNING
        comment_id,
        lesson_id,
        user_id,
        content,
        reply_id,
        created_at,
        updated_at
    `;

    return NextResponse.json(
      { comment: newComment },
      { status: 201, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("Error in POST /api/comments:", err);
    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 500, headers: corsHeaders }
    );
  }
}