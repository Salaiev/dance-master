import { NextResponse } from "next/server";
import sql from "@/utilities/db";
import { jwtVerify } from "jose";

function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const [type, token] = auth.split(" ");
  if (type?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

async function requireAdmin(req: Request) {
  const token = getBearerToken(req);
  if (!token) {
    return { ok: false as const, status: 401, error: "Missing Authorization token" };
  }

  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    return { ok: false as const, status: 500, error: "ACCESS_TOKEN_SECRET not configured" };
  }

  let userId: string | null = null;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const p: any = payload;
    userId =
      p.user_id || p.userId || p.sub || p.id || p.userID || p.uid ||
      p.user?.id || p.user?.user_id || null;
  } catch {
    return { ok: false as const, status: 401, error: "Invalid or expired token" };
  }

  if (!userId) {
    return { ok: false as const, status: 401, error: "Token missing user id" };
  }

  const rows = await sql`
    SELECT role FROM ssu_users WHERE user_id = ${userId} LIMIT 1
  `;

  if (!rows.length) return { ok: false as const, status: 401, error: "User not found" };
  if (rows[0].role !== "admin") return { ok: false as const, status: 403, error: "Admin only" };

  return { ok: true as const, userId };
}

function normalizeDifficulty(input: any) {
  const d = String(input ?? "").trim().toUpperCase();
  if (!d) return null;
  if (!["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(d)) return "__INVALID__";
  return d;
}

// ================= GET =================
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const rows = await sql`
    SELECT
      lesson_id,
      title,
      style,
      difficulty,
      duration_sec,
      video_url,
      description,
      thumbnail_url,
      created_at,
      updated_at
    FROM dm_lessons
    WHERE lesson_id = ${id}
    LIMIT 1
  `;

  if (!rows.length) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  return NextResponse.json({ item: rows[0] });
}

// ================= PATCH =================
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const body = await request.json();

  const title       = body?.title       !== undefined ? String(body.title).trim() : undefined;
  const style       = body?.style       !== undefined ? String(body.style).trim() : undefined;
  const difficulty  = body?.difficulty  !== undefined ? normalizeDifficulty(body.difficulty) : undefined;

  const duration_sec =
    body?.duration_sec !== undefined
      ? Number(body.duration_sec) || 0
      : undefined;

  const video_url =
    body?.video_url !== undefined
      ? (body.video_url ? String(body.video_url).trim() : null)
      : undefined;

  const description =
    body?.description !== undefined
      ? (body.description ? String(body.description).trim() : null)
      : undefined;

  const thumbnail_url =
    body?.thumbnail_url !== undefined
      ? (body.thumbnail_url ? String(body.thumbnail_url).trim() : null)
      : undefined;

  if (difficulty === "__INVALID__") {
    return NextResponse.json(
      { error: "difficulty must be BEGINNER, INTERMEDIATE, or ADVANCED" },
      { status: 400 }
    );
  }

  const updated = await sql`
    UPDATE dm_lessons
    SET
      title         = COALESCE(${title ?? null}, title),
      style         = COALESCE(${style ?? null}, style),
      difficulty    = COALESCE(${difficulty ?? null}::dm_difficulty, difficulty),
      duration_sec  = COALESCE(${duration_sec ?? null}, duration_sec),
      video_url     = ${video_url   === undefined ? sql`video_url`   : video_url},
      description   = ${description === undefined ? sql`description` : description},
      thumbnail_url = ${thumbnail_url === undefined ? sql`thumbnail_url` : thumbnail_url},
      updated_at    = NOW()
    WHERE lesson_id = ${id}
    RETURNING
      lesson_id,
      title,
      style,
      difficulty,
      duration_sec,
      video_url,
      description,
      thumbnail_url,
      created_at,
      updated_at
  `;

  if (!updated.length) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  return NextResponse.json({ item: updated[0] });
}

export async function PUT(request: Request, ctx: any) {
  return PATCH(request, ctx);
}

// ================= DELETE =================
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const deleted = await sql`
    DELETE FROM dm_lessons
    WHERE lesson_id = ${id}
    RETURNING lesson_id
  `;

  if (!deleted.length) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, lesson_id: deleted[0].lesson_id });
}