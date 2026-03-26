import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/utilities/cors";
import sql from "@/utilities/db";

// Level thresholds (must match challenges/route.ts)
const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 1000, 1750, 2750, 4000, 5500, 7500,
];

function getLevel(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

// POST /api/challenges/check
// Call this after a lesson is completed or progress is updated
// Body: { user_id }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: "user_id is required." },
        { status: 400, headers: corsHeaders }
      );
    }

    // Ensure XP row exists
    await sql`
      INSERT INTO dm_user_xp (user_id)
      VALUES (${user_id})
      ON CONFLICT (user_id) DO NOTHING
    `;

    const awarded: { type: string; title: string; xp: number; icon: string }[] = [];
    let totalNewXp = 0;

    // ─── 1. Update streak ─────────────────────────────
    const xpRows = await sql`
      SELECT total_xp, current_streak, longest_streak, last_activity_date
      FROM dm_user_xp WHERE user_id = ${user_id}
    `;
    const xpData = xpRows[0];
    const today = new Date().toISOString().split("T")[0];
    const lastDate = xpData.last_activity_date
      ? new Date(xpData.last_activity_date).toISOString().split("T")[0]
      : null;

    let newStreak = xpData.current_streak || 0;

    if (lastDate !== today) {
      // Check if yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      if (lastDate === yesterdayStr) {
        newStreak += 1;
      } else if (lastDate !== today) {
        newStreak = 1; // Reset streak
      }

      const newLongest = Math.max(xpData.longest_streak || 0, newStreak);

      await sql`
        UPDATE dm_user_xp
        SET current_streak = ${newStreak},
            longest_streak = ${newLongest},
            last_activity_date = ${today},
            updated_at = NOW()
        WHERE user_id = ${user_id}
      `;

      // Daily login XP (10 XP per day)
      totalNewXp += 10;
      await sql`
        INSERT INTO dm_xp_log (user_id, xp_amount, reason)
        VALUES (${user_id}, 10, 'daily_login')
      `;
      awarded.push({ type: "daily", title: "Daily Practice", xp: 10, icon: "📅" });

      // Streak bonus (5 XP per streak day beyond 1)
      if (newStreak > 1) {
        const streakBonus = Math.min(newStreak * 5, 50); // Cap at 50
        totalNewXp += streakBonus;
        await sql`
          INSERT INTO dm_xp_log (user_id, xp_amount, reason)
          VALUES (${user_id}, ${streakBonus}, 'streak_bonus')
        `;
        awarded.push({ type: "streak", title: `${newStreak}-Day Streak Bonus`, xp: streakBonus, icon: "🔥" });
      }
    }

    // ─── 2. Check badge eligibility ───────────────────
    // Get user stats
    const statsRows = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed_lessons,
        COALESCE(SUM(time_spent_sec), 0) AS total_time_sec
      FROM dm_progress WHERE user_id = ${user_id}
    `;
    const stats = statsRows[0] || { completed_lessons: 0, total_time_sec: 0 };

    const noteCount = await sql`
      SELECT COUNT(*) AS count FROM dm_notes WHERE user_id = ${user_id}
    `;
    const commentCount = await sql`
      SELECT COUNT(*) AS count FROM dm_comments WHERE user_id = ${user_id}
    `;

    // Get unearned badges
    const unearnedBadges = await sql`
      SELECT b.*
      FROM dm_badges b
      WHERE NOT EXISTS (
        SELECT 1 FROM dm_user_badges ub
        WHERE ub.badge_id = b.badge_id AND ub.user_id = ${user_id}
      )
      ORDER BY b.sort_order ASC
    `;

    for (const badge of unearnedBadges) {
      let currentValue = 0;

      switch (badge.requirement_type) {
        case "lessons_completed":
          currentValue = Number(stats.completed_lessons) || 0;
          break;
        case "streak_days":
          currentValue = newStreak;
          break;
        case "total_time_min":
          currentValue = Math.floor((Number(stats.total_time_sec) || 0) / 60);
          break;
        case "first_note":
          currentValue = Math.min(1, Number(noteCount[0]?.count) || 0);
          break;
        case "first_comment":
          currentValue = Math.min(1, Number(commentCount[0]?.count) || 0);
          break;
      }

      if (currentValue >= badge.requirement_value) {
        // Award badge
        await sql`
          INSERT INTO dm_user_badges (user_id, badge_id)
          VALUES (${user_id}, ${badge.badge_id})
          ON CONFLICT (user_id, badge_id) DO NOTHING
        `;

        totalNewXp += badge.xp_reward;
        await sql`
          INSERT INTO dm_xp_log (user_id, xp_amount, reason, reference_id)
          VALUES (${user_id}, ${badge.xp_reward}, 'badge_earned', ${badge.badge_id})
        `;

        awarded.push({
          type: "badge",
          title: badge.title,
          xp: badge.xp_reward,
          icon: badge.icon,
        });
      }
    }

    // ─── 3. Check weekly challenges ───────────────────
    const weeklyChallenges = await sql`
      SELECT wc.*
      FROM dm_weekly_challenges wc
      WHERE wc.week_start = date_trunc('week', CURRENT_DATE)::date
    `;

    for (const challenge of weeklyChallenges) {
      // Ensure user challenge row exists
      await sql`
        INSERT INTO dm_user_challenges (user_id, challenge_id)
        VALUES (${user_id}, ${challenge.challenge_id})
        ON CONFLICT (user_id, challenge_id) DO NOTHING
      `;

      // Calculate current value based on challenge type
      let currentValue = 0;

      switch (challenge.challenge_type) {
        case "practice_days": {
          const daysRows = await sql`
            SELECT COUNT(DISTINCT DATE(last_accessed_at)) AS days
            FROM dm_progress
            WHERE user_id = ${user_id}
              AND last_accessed_at >= date_trunc('week', CURRENT_DATE)
          `;
          currentValue = Number(daysRows[0]?.days) || 0;
          break;
        }
        case "complete_lessons": {
          const completedRows = await sql`
            SELECT COUNT(*) AS count
            FROM dm_progress
            WHERE user_id = ${user_id}
              AND status = 'COMPLETED'
              AND completed_at >= date_trunc('week', CURRENT_DATE)
          `;
          currentValue = Number(completedRows[0]?.count) || 0;
          break;
        }
        case "watch_minutes": {
          const timeRows = await sql`
            SELECT COALESCE(SUM(time_spent_sec), 0) AS total_sec
            FROM dm_progress
            WHERE user_id = ${user_id}
              AND last_accessed_at >= date_trunc('week', CURRENT_DATE)
          `;
          currentValue = Math.floor((Number(timeRows[0]?.total_sec) || 0) / 60);
          break;
        }
        case "add_notes": {
          const notesRows = await sql`
            SELECT COUNT(*) AS count
            FROM dm_notes
            WHERE user_id = ${user_id}
              AND created_at >= date_trunc('week', CURRENT_DATE)
          `;
          currentValue = Number(notesRows[0]?.count) || 0;
          break;
        }
      }

      // Update challenge progress
      const wasCompleted = await sql`
        SELECT is_completed FROM dm_user_challenges
        WHERE user_id = ${user_id} AND challenge_id = ${challenge.challenge_id}
      `;

      const alreadyCompleted = wasCompleted[0]?.is_completed;
      const nowCompleted = currentValue >= challenge.target_value;

      await sql`
        UPDATE dm_user_challenges
        SET current_value = ${currentValue},
            is_completed = ${nowCompleted},
            completed_at = CASE
              WHEN ${nowCompleted} AND NOT is_completed THEN NOW()
              ELSE completed_at
            END,
            updated_at = NOW()
        WHERE user_id = ${user_id} AND challenge_id = ${challenge.challenge_id}
      `;

      // Award XP if newly completed
      if (nowCompleted && !alreadyCompleted) {
        totalNewXp += challenge.xp_reward;
        await sql`
          INSERT INTO dm_xp_log (user_id, xp_amount, reason, reference_id)
          VALUES (${user_id}, ${challenge.xp_reward}, 'challenge_completed', ${challenge.challenge_id})
        `;
        awarded.push({
          type: "challenge",
          title: challenge.title,
          xp: challenge.xp_reward,
          icon: challenge.icon,
        });
      }
    }

    // ─── 4. Update total XP and level ─────────────────
    if (totalNewXp > 0) {
      await sql`
        UPDATE dm_user_xp
        SET total_xp = total_xp + ${totalNewXp},
            current_level = ${getLevel((xpData?.total_xp || 0) + totalNewXp)},
            updated_at = NOW()
        WHERE user_id = ${user_id}
      `;
    }

    const finalXp = await sql`
      SELECT total_xp, current_level, current_streak, longest_streak
      FROM dm_user_xp WHERE user_id = ${user_id}
    `;

    return NextResponse.json(
      {
        message: "Challenges checked successfully.",
        awarded,
        total_new_xp: totalNewXp,
        xp: finalXp[0],
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("Error in POST /api/challenges/check:", err);
    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 500, headers: corsHeaders }
    );
  }
}