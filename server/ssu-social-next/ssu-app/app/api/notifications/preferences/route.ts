import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { corsHeaders } from "@/utilities/cors";
import sql from "@/utilities/db";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

function getUserIdFromToken(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized: Missing token");
  }

  const token = authHeader.split(" ")[1];
  const decoded: any = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!);

  const userId =
    decoded?.id || decoded?.user_id || decoded?.userId || decoded?.sub;

  if (!userId) {
    throw new Error("Invalid token payload");
  }

  return userId;
}

export async function GET(req: Request) {
  try {
    let userId: string;

    try {
      userId = getUserIdFromToken(req);
    } catch (err: any) {
      return NextResponse.json(
        { success: false, message: err.message || "Unauthorized" },
        { status: 401, headers: corsHeaders }
      );
    }

    const [user] = await sql`
      SELECT user_id, email
      FROM ssu_users
      WHERE user_id = ${userId}
    `;

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    const [existingPreferences] = await sql`
      SELECT
        user_id::text AS "userId",
        email_enabled AS "emailEnabled",
        challenge_completed_email AS "challengeCompletedEmail",
        badge_earned_email AS "badgeEarnedEmail",
        inactivity_email AS "inactivityEmail",
        inactivity_days_threshold AS "inactivityDaysThreshold",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM dm_notification_preferences
      WHERE user_id = ${userId}
    `;

    if (existingPreferences) {
      return NextResponse.json(
        {
          success: true,
          preferences: existingPreferences,
        },
        { status: 200, headers: corsHeaders }
      );
    }

    const [createdPreferences] = await sql`
      INSERT INTO dm_notification_preferences (
        user_id,
        email_enabled,
        challenge_completed_email,
        badge_earned_email,
        inactivity_email,
        inactivity_days_threshold
      )
      VALUES (
        ${userId},
        TRUE,
        TRUE,
        TRUE,
        TRUE,
        3
      )
      RETURNING
        user_id::text AS "userId",
        email_enabled AS "emailEnabled",
        challenge_completed_email AS "challengeCompletedEmail",
        badge_earned_email AS "badgeEarnedEmail",
        inactivity_email AS "inactivityEmail",
        inactivity_days_threshold AS "inactivityDaysThreshold",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `;

    return NextResponse.json(
      {
        success: true,
        preferences: createdPreferences,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("🔥 Error fetching notification preferences:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Server error while fetching notification preferences",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PUT(req: Request) {
  try {
    let userId: string;

    try {
      userId = getUserIdFromToken(req);
    } catch (err: any) {
      return NextResponse.json(
        { success: false, message: err.message || "Unauthorized" },
        { status: 401, headers: corsHeaders }
      );
    }

    const [user] = await sql`
      SELECT user_id, email
      FROM ssu_users
      WHERE user_id = ${userId}
    `;

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    const body = await req.json();

    const emailEnabled =
      typeof body.emailEnabled === "boolean" ? body.emailEnabled : null;

    const challengeCompletedEmail =
      typeof body.challengeCompletedEmail === "boolean"
        ? body.challengeCompletedEmail
        : null;

    const badgeEarnedEmail =
      typeof body.badgeEarnedEmail === "boolean"
        ? body.badgeEarnedEmail
        : null;

    const inactivityEmail =
      typeof body.inactivityEmail === "boolean" ? body.inactivityEmail : null;

    const inactivityDaysThreshold =
      typeof body.inactivityDaysThreshold === "number" &&
      Number.isInteger(body.inactivityDaysThreshold)
        ? body.inactivityDaysThreshold
        : null;

    if (
      inactivityDaysThreshold !== null &&
      (inactivityDaysThreshold < 1 || inactivityDaysThreshold > 365)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Inactivity days threshold must be between 1 and 365",
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const [existingPreferences] = await sql`
      SELECT user_id
      FROM dm_notification_preferences
      WHERE user_id = ${userId}
    `;

    if (!existingPreferences) {
      await sql`
        INSERT INTO dm_notification_preferences (
          user_id,
          email_enabled,
          challenge_completed_email,
          badge_earned_email,
          inactivity_email,
          inactivity_days_threshold
        )
        VALUES (
          ${userId},
          TRUE,
          TRUE,
          TRUE,
          TRUE,
          3
        )
      `;
    }

    const [updatedPreferences] = await sql`
      UPDATE dm_notification_preferences
      SET
        email_enabled = COALESCE(${emailEnabled}, email_enabled),
        challenge_completed_email = COALESCE(${challengeCompletedEmail}, challenge_completed_email),
        badge_earned_email = COALESCE(${badgeEarnedEmail}, badge_earned_email),
        inactivity_email = COALESCE(${inactivityEmail}, inactivity_email),
        inactivity_days_threshold = COALESCE(${inactivityDaysThreshold}, inactivity_days_threshold)
      WHERE user_id = ${userId}
      RETURNING
        user_id::text AS "userId",
        email_enabled AS "emailEnabled",
        challenge_completed_email AS "challengeCompletedEmail",
        badge_earned_email AS "badgeEarnedEmail",
        inactivity_email AS "inactivityEmail",
        inactivity_days_threshold AS "inactivityDaysThreshold",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `;

    return NextResponse.json(
      {
        success: true,
        message: "Notification preferences updated successfully",
        preferences: updatedPreferences,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("🔥 Error updating notification preferences:", error);

    if (error?.name === "JsonWebTokenError" || error?.name === "TokenExpiredError") {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Server error while updating notification preferences",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}