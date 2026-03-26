import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/utilities/cors";
import sql from "@/utilities/db";

// Level thresholds
const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 1000, 1750, 2750, 4000, 5500, 7500,
];

function getLevel(xp: number): { level: number; currentXp: number; nextLevelXp: number; progress: number } {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }

  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + 2500;
  const progress = nextThreshold > currentThreshold
    ? ((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100
    : 100;

  return {
    level,
    currentXp: xp,
    nextLevelXp: nextThreshold,
    progress: Math.min(100, Math.round(progress)),
  };
}

// GET /api/challenges?user_id=<uuid>
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required query parameter: user_id" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Ensure user exists
    const user = await sql`
      SELECT user_id FROM ssu_users WHERE user_id = ${userId} LIMIT 1
    `;
    if (!user.length) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404, headers: corsHeaders }
      );
    }

    // Ensure dm_user_xp row exists
    await sql`
      INSERT INTO dm_user_xp (user_id)
      VALUES (${userId})
      ON CONFLICT (user_id) DO NOTHING
    `;

    // Get XP data
    const xpRows = await sql`
      SELECT total_xp, current_streak, longest_streak, last_activity_date
      FROM dm_user_xp
      WHERE user_id = ${userId}
    `;
    const xpData = xpRows[0] || { total_xp: 0, current_streak: 0, longest_streak: 0 };
    const levelInfo = getLevel(xpData.total_xp);

    // Get all badges with earned status
    const badges = await sql`
      SELECT
        b.badge_id,
        b.slug,
        b.title,
        b.description,
        b.icon,
        b.category,
        b.xp_reward,
        b.requirement_type,
        b.requirement_value,
        b.sort_order,
        ub.earned_at
      FROM dm_badges b
      LEFT JOIN dm_user_badges ub
        ON ub.badge_id = b.badge_id AND ub.user_id = ${userId}
      ORDER BY b.sort_order ASC
    `;

    // Get current week challenges
    const weeklyChallenges = await sql`
      SELECT
        wc.challenge_id,
        wc.title,
        wc.description,
        wc.icon,
        wc.challenge_type,
        wc.target_value,
        wc.xp_reward,
        wc.week_start,
        COALESCE(uc.current_value, 0) AS current_value,
        COALESCE(uc.is_completed, false) AS is_completed,
        uc.completed_at
      FROM dm_weekly_challenges wc
      LEFT JOIN dm_user_challenges uc
        ON uc.challenge_id = wc.challenge_id AND uc.user_id = ${userId}
      WHERE wc.week_start = date_trunc('week', CURRENT_DATE)::date
      ORDER BY wc.created_at ASC
    `;

    // Get user stats for badge progress calculation
    const statsRows = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed_lessons,
        COALESCE(SUM(time_spent_sec), 0) AS total_time_sec
      FROM dm_progress
      WHERE user_id = ${userId}
    `;
    const stats = statsRows[0] || { completed_lessons: 0, total_time_sec: 0 };

    const noteCount = await sql`
      SELECT COUNT(*) AS count FROM dm_notes WHERE user_id = ${userId}
    `;

    const commentCount = await sql`
      SELECT COUNT(*) AS count FROM dm_comments WHERE user_id = ${userId}
    `;

    // Calculate badge progress
    const badgesWithProgress = badges.map((b: any) => {
      let currentProgress = 0;

      switch (b.requirement_type) {
        case "lessons_completed":
          currentProgress = Number(stats.completed_lessons) || 0;
          break;
        case "streak_days":
          currentProgress = Number(xpData.current_streak) || 0;
          break;
        case "total_time_min":
          currentProgress = Math.floor((Number(stats.total_time_sec) || 0) / 60);
          break;
        case "first_note":
          currentProgress = Math.min(1, Number(noteCount[0]?.count) || 0);
          break;
        case "first_comment":
          currentProgress = Math.min(1, Number(commentCount[0]?.count) || 0);
          break;
        default:
          currentProgress = 0;
      }

      return {
        ...b,
        current_progress: currentProgress,
        is_earned: !!b.earned_at,
        progress_percent: Math.min(100, Math.round((currentProgress / b.requirement_value) * 100)),
      };
    });

    // Recent XP log
    const recentXp = await sql`
      SELECT xp_amount, reason, created_at
      FROM dm_xp_log
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 10
    `;

    return NextResponse.json(
      {
        xp: {
          ...levelInfo,
          total_xp: xpData.total_xp,
          current_streak: xpData.current_streak,
          longest_streak: xpData.longest_streak,
          last_activity_date: xpData.last_activity_date,
        },
        badges: badgesWithProgress,
        weekly_challenges: weeklyChallenges,
        recent_xp: recentXp,
        stats: {
          completed_lessons: Number(stats.completed_lessons) || 0,
          total_time_min: Math.floor((Number(stats.total_time_sec) || 0) / 60),
          total_notes: Number(noteCount[0]?.count) || 0,
          total_comments: Number(commentCount[0]?.count) || 0,
        },
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("Error in GET /api/challenges:", err);
    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 500, headers: corsHeaders }
    );
  }
}