import { NextResponse } from "next/server";
import { corsHeaders } from "@/utilities/cors";
import sql from "@/utilities/db";
import { sendInactivityReminderNotification } from "../../../lib/notificationService";
export const runtime = "nodejs";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json(
        { success: false, message: "Missing CRON_SECRET" },
        { status: 500, headers: corsHeaders }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401, headers: corsHeaders }
      );
    }

    const inactiveUsers = await sql`
      SELECT
        u.user_id::text AS "userId",
        u.username,
        u.email,
        p.inactivity_days_threshold AS "inactivityDaysThreshold",
        ux.last_activity_date AS "lastActivityDate"
      FROM ssu_users u
      INNER JOIN dm_notification_preferences p
        ON p.user_id = u.user_id
      LEFT JOIN dm_user_xp ux
        ON ux.user_id = u.user_id
      WHERE p.email_enabled = TRUE
        AND p.inactivity_email = TRUE
        AND u.email IS NOT NULL
        AND (
          ux.last_activity_date IS NULL
          OR ux.last_activity_date <= CURRENT_DATE - p.inactivity_days_threshold
        )
    `;

    const results = [];

    for (const user of inactiveUsers) {
      try {
        let daysInactive = user.inactivityDaysThreshold;

        if (user.lastActivityDate) {
          const lastActivity = new Date(user.lastActivityDate);
          const today = new Date();

          const diffMs = today.getTime() - lastActivity.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

          daysInactive = Math.max(diffDays, user.inactivityDaysThreshold);
        }

        await sendInactivityReminderNotification({
          userId: user.userId,
          daysInactive,
        });

        results.push({
          userId: user.userId,
          email: user.email,
          status: "processed",
        });
      } catch (error: any) {
        console.error(
          `Failed inactivity reminder for user ${user.userId}:`,
          error
        );

        results.push({
          userId: user.userId,
          email: user.email,
          status: "failed",
          error: error?.message || "Unknown error",
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Inactivity reminder job completed",
        totalCandidates: inactiveUsers.length,
        processed: results.length,
        results,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("🔥 Error running inactivity reminder cron:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Server error while running inactivity reminders",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}