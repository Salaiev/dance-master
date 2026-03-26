import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/utilities/cors";
import sql from "@/utilities/db";

// Path: /api/comments/[id]
function getCommentId(req: NextRequest): string | null {
  const segments = req.nextUrl.pathname.split("/");
  return segments[segments.length - 1] || null;
}

// ---------------------------------------------------------------------------
// DELETE /api/comments/[id]
// Body: { user_id: string }
// Only author can delete
// ---------------------------------------------------------------------------
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

    const commentId = getCommentId(req);
    if (!commentId) {
      return NextResponse.json(
        { error: "Missing comment ID in the request path." },
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify comment exists
    const existing = await sql`
      SELECT comment_id, user_id
      FROM dm_comments
      WHERE comment_id = ${commentId}
      LIMIT 1
    `;

    if (!existing.length) {
      return NextResponse.json(
        { error: "Comment not found." },
        { status: 404, headers: corsHeaders }
      );
    }

    // Only author can delete
    if (existing[0].user_id !== user_id) {
      return NextResponse.json(
        { error: "You are not authorized to delete this comment." },
        { status: 403, headers: corsHeaders }
      );
    }

    // Delete comment (replies removed if reply_id FK is ON DELETE CASCADE)
    await sql`
      DELETE FROM dm_comments
      WHERE comment_id = ${commentId}
    `;

    return NextResponse.json(
      { message: "Comment deleted successfully." },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("Error in DELETE /api/comments/[id]:", err);
    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/comments/[id]
// Body: { user_id: string, content: string }
// Only author can edit
// ---------------------------------------------------------------------------
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

    const commentId = getCommentId(req);
    if (!commentId) {
      return NextResponse.json(
        { error: "Missing comment ID in the request path." },
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify comment exists
    const existing = await sql`
      SELECT comment_id, user_id
      FROM dm_comments
      WHERE comment_id = ${commentId}
      LIMIT 1
    `;

    if (!existing.length) {
      return NextResponse.json(
        { error: "Comment not found." },
        { status: 404, headers: corsHeaders }
      );
    }

    // Only author can edit
    if (existing[0].user_id !== user_id) {
      return NextResponse.json(
        { error: "You are not authorized to edit this comment." },
        { status: 403, headers: corsHeaders }
      );
    }

    const updated = await sql`
      UPDATE dm_comments
      SET content = ${content.trim()},
          updated_at = NOW()
      WHERE comment_id = ${commentId}
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
      { comment: updated[0] },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("Error in PATCH /api/comments/[id]:", err);
    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 500, headers: corsHeaders }
    );
  }
}