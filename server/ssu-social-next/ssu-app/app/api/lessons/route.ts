import { NextResponse } from "next/server";
import sql from "@/utilities/db";
import { jwtVerify } from "jose";

// ====== helpers ======
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

  // ✅ Use your project’s access-token secret (matches your .env)
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    return { ok: false as const, status: 500, error: "ACCESS_TOKEN_SECRET not configured" };
  }

  let userId: string | null = null;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));

    // ✅ TEMP DEBUG (remove later)
    // console.log("LESSONS requireAdmin payload:", payload);

    // ✅ Support many common payload shapes
    const p: any = payload;
    userId =
      p.user_id ||
      p.userId ||
      p.sub ||
      p.id ||
      p.userID ||
      p.uid ||
      p.user?.id ||
      p.user?.user_id ||
      null;
  } catch {
    return { ok: false as const, status: 401, error: "Invalid or expired token" };
  }

  if (!userId) {
    return { ok: false as const, status: 401, error: "Token missing user id" };
  }

  // ✅ NOTE:
  // If your users table uses "id" instead of "user_id", change WHERE accordingly.
  const rows = await sql`
    SELECT role
    FROM ssu_users
    WHERE user_id = ${userId}
    LIMIT 1
  `;

  if (!rows?.length) {
    return { ok: false as const, status: 401, error: "User not found" };
  }

  if (rows[0].role !== "admin") {
    return { ok: false as const, status: 403, error: "Admin only" };
  }

  return { ok: true as const, userId };
}

// ====== GET: public ======
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const style = url.searchParams.get("style");
    const difficulty = url.searchParams.get("difficulty");

    let rows;

    if (style && difficulty) {
      rows = await sql`
        SELECT lesson_id, title, style, difficulty, duration_sec, video_url, description, created_at, updated_at
        FROM dm_lessons
        WHERE style = ${style} AND difficulty = ${difficulty}
        ORDER BY created_at DESC
      `;
    } else if (style) {
      rows = await sql`
        SELECT lesson_id, title, style, difficulty, duration_sec, video_url, description, created_at, updated_at
        FROM dm_lessons
        WHERE style = ${style}
        ORDER BY created_at DESC
      `;
    } else if (difficulty) {
      rows = await sql`
        SELECT lesson_id, title, style, difficulty, duration_sec, video_url, description, created_at, updated_at
        FROM dm_lessons
        WHERE difficulty = ${difficulty}
        ORDER BY created_at DESC
      `;
    } else {
      rows = await sql`
        SELECT lesson_id, title, style, difficulty, duration_sec, video_url, description, created_at, updated_at
        FROM dm_lessons
        ORDER BY created_at DESC
      `;
    }

    return NextResponse.json({ items: rows });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to fetch lessons" },
      { status: 500 }
    );
  }
}

// ====== POST: admin only ======
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin(req);
    if (!admin.ok) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const body = await req.json();

    const title = (body?.title ?? "").trim();
    const style = (body?.style ?? "").trim();
    const difficulty = (body?.difficulty ?? "").trim().toUpperCase(); // BEGINNER/INTERMEDIATE/ADVANCED
    const duration_sec = Number.isFinite(Number(body?.duration_sec))
      ? Number(body.duration_sec)
      : 0;

    const video_url = body?.video_url ? String(body.video_url).trim() : null;
    const description = body?.description ? String(body.description).trim() : null;

    if (!title || !style || !difficulty) {
      return NextResponse.json(
        { error: "title, style, difficulty are required" },
        { status: 400 }
      );
    }

    if (!["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(difficulty)) {
      return NextResponse.json(
        { error: "difficulty must be BEGINNER, INTERMEDIATE, or ADVANCED" },
        { status: 400 }
      );
    }

    const inserted = await sql`
      INSERT INTO dm_lessons (title, style, difficulty, duration_sec, video_url, description)
      VALUES (${title}, ${style}, ${difficulty}::dm_difficulty, ${duration_sec}, ${video_url}, ${description})
      RETURNING lesson_id, title, style, difficulty, duration_sec, video_url, description, created_at, updated_at
    `;

    return NextResponse.json({ item: inserted[0] }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to create lesson" },
      { status: 500 }
    );
  }
}