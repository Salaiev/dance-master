import sql from "@/utilities/db";
import {
  sendNotificationEmail,
  buildChallengeCompletedEmail,
  buildBadgeEarnedEmail,
  buildInactivityReminderEmail,
} from "./notificationEmail";

type NotificationPreferenceRow = {
  userId: string;
  emailEnabled: boolean;
  challengeCompletedEmail: boolean;
  badgeEarnedEmail: boolean;
  inactivityEmail: boolean;
  inactivityDaysThreshold: number;
};

type UserRow = {
  userId: string;
  username: string | null;
  email: string | null;
};

async function getUserWithPreferences(userId: string) {
  const [user] = await sql<UserRow[]>`
    SELECT
      user_id::text AS "userId",
      username,
      email
    FROM ssu_users
    WHERE user_id = ${userId}
  `;

  if (!user) {
    throw new Error("User not found");
  }

  const [preferences] = await sql<NotificationPreferenceRow[]>`
    SELECT
      user_id::text AS "userId",
      email_enabled AS "emailEnabled",
      challenge_completed_email AS "challengeCompletedEmail",
      badge_earned_email AS "badgeEarnedEmail",
      inactivity_email AS "inactivityEmail",
      inactivity_days_threshold AS "inactivityDaysThreshold"
    FROM dm_notification_preferences
    WHERE user_id = ${userId}
  `;

  if (preferences) {
    return { user, preferences };
  }

  const [createdPreferences] = await sql<NotificationPreferenceRow[]>`
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
      inactivity_days_threshold AS "inactivityDaysThreshold"
  `;

  return { user, preferences: createdPreferences };
}

async function insertInAppNotification(args: {
  userId: string;
  type: "REMINDER" | "ACHIEVEMENT" | "SYSTEM";
  title: string;
  message: string;
}) {
  await sql`
    INSERT INTO dm_notifications (
      user_id,
      type,
      title,
      message
    )
    VALUES (
      ${args.userId},
      ${args.type},
      ${args.title},
      ${args.message}
    )
  `;
}

async function insertEmailLog(args: {
  userId: string;
  emailType: string;
  referenceType?: string | null;
  referenceId?: string | null;
  sentToEmail: string;
  status: "sent" | "failed" | "skipped";
  subject?: string | null;
  metadata?: Record<string, any> | null;
}) {
  await sql`
    INSERT INTO dm_email_notifications_log (
      user_id,
      email_type,
      reference_type,
      reference_id,
      sent_to_email,
      status,
      subject,
      metadata
    )
    VALUES (
      ${args.userId},
      ${args.emailType},
      ${args.referenceType ?? null},
      ${args.referenceId ?? null},
      ${args.sentToEmail},
      ${args.status},
      ${args.subject ?? null},
      ${args.metadata ? JSON.stringify(args.metadata) : null}::jsonb
    )
  `;
}

async function wasRecentlySent(args: {
  userId: string;
  emailType: string;
  referenceType?: string | null;
  referenceId?: string | null;
  withinHours?: number;
}) {
  const withinHours = args.withinHours ?? 24;

  const [existing] = await sql`
    SELECT email_notification_id
    FROM dm_email_notifications_log
    WHERE user_id = ${args.userId}
      AND email_type = ${args.emailType}
      AND COALESCE(reference_type, '') = COALESCE(${args.referenceType ?? null}, '')
      AND COALESCE(reference_id, '') = COALESCE(${args.referenceId ?? null}, '')
      AND status = 'sent'
      AND sent_at >= NOW() - (${withinHours} || ' hours')::interval
    LIMIT 1
  `;

  return !!existing;
}

export async function sendChallengeCompletedNotification(args: {
  userId: string;
  challengeId: string;
}) {
  const { user, preferences } = await getUserWithPreferences(args.userId);

  if (!user.email) {
    return;
  }

  const [challenge] = await sql`
    SELECT
      challenge_id::text AS "challengeId",
      title,
      description
    FROM dm_weekly_challenges
    WHERE challenge_id = ${args.challengeId}
  `;

  if (!challenge) {
    throw new Error("Challenge not found");
  }

  const title = "Challenge completed";
  const message = `You completed the challenge "${challenge.title}".`;

  await insertInAppNotification({
    userId: args.userId,
    type: "ACHIEVEMENT",
    title,
    message,
  });

  if (!preferences.emailEnabled || !preferences.challengeCompletedEmail) {
    await insertEmailLog({
      userId: args.userId,
      emailType: "challenge_completed",
      referenceType: "challenge",
      referenceId: args.challengeId,
      sentToEmail: user.email,
      status: "skipped",
      subject: title,
      metadata: { reason: "preferences_disabled" },
    });
    return;
  }

  const alreadySent = await wasRecentlySent({
    userId: args.userId,
    emailType: "challenge_completed",
    referenceType: "challenge",
    referenceId: args.challengeId,
    withinHours: 24 * 30,
  });

  if (alreadySent) {
    return;
  }

  const email = buildChallengeCompletedEmail({
    username: user.username || "Dancer",
    challengeTitle: challenge.title,
  });

  try {
    await sendNotificationEmail({
      to: user.email,
      subject: email.subject,
      html: email.html,
    });

    await insertEmailLog({
      userId: args.userId,
      emailType: "challenge_completed",
      referenceType: "challenge",
      referenceId: args.challengeId,
      sentToEmail: user.email,
      status: "sent",
      subject: email.subject,
      metadata: { challengeTitle: challenge.title },
    });
  } catch (error: any) {
    await insertEmailLog({
      userId: args.userId,
      emailType: "challenge_completed",
      referenceType: "challenge",
      referenceId: args.challengeId,
      sentToEmail: user.email,
      status: "failed",
      subject: email.subject,
      metadata: { error: error?.message || "Unknown error" },
    });

    throw error;
  }
}

export async function sendBadgeEarnedNotification(args: {
  userId: string;
  badgeId: string;
}) {
  const { user, preferences } = await getUserWithPreferences(args.userId);

  if (!user.email) {
    return;
  }

  const [badge] = await sql`
    SELECT
      badge_id::text AS "badgeId",
      title,
      description,
      icon
    FROM dm_badges
    WHERE badge_id = ${args.badgeId}
  `;

  if (!badge) {
    throw new Error("Badge not found");
  }

  const title = "New badge earned";
  const message = `You earned the "${badge.title}" badge.`;

  await insertInAppNotification({
    userId: args.userId,
    type: "ACHIEVEMENT",
    title,
    message,
  });

  if (!preferences.emailEnabled || !preferences.badgeEarnedEmail) {
    await insertEmailLog({
      userId: args.userId,
      emailType: "badge_earned",
      referenceType: "badge",
      referenceId: args.badgeId,
      sentToEmail: user.email,
      status: "skipped",
      subject: title,
      metadata: { reason: "preferences_disabled" },
    });
    return;
  }

  const alreadySent = await wasRecentlySent({
    userId: args.userId,
    emailType: "badge_earned",
    referenceType: "badge",
    referenceId: args.badgeId,
    withinHours: 24 * 30,
  });

  if (alreadySent) {
    return;
  }

  const email = buildBadgeEarnedEmail({
    username: user.username || "Dancer",
    badgeTitle: badge.title,
    badgeDescription: badge.description,
  });

  try {
    await sendNotificationEmail({
      to: user.email,
      subject: email.subject,
      html: email.html,
    });

    await insertEmailLog({
      userId: args.userId,
      emailType: "badge_earned",
      referenceType: "badge",
      referenceId: args.badgeId,
      sentToEmail: user.email,
      status: "sent",
      subject: email.subject,
      metadata: { badgeTitle: badge.title },
    });
  } catch (error: any) {
    await insertEmailLog({
      userId: args.userId,
      emailType: "badge_earned",
      referenceType: "badge",
      referenceId: args.badgeId,
      sentToEmail: user.email,
      status: "failed",
      subject: email.subject,
      metadata: { error: error?.message || "Unknown error" },
    });

    throw error;
  }
}

export async function sendInactivityReminderNotification(args: {
  userId: string;
  daysInactive: number;
}) {
  const { user, preferences } = await getUserWithPreferences(args.userId);

  if (!user.email) {
    return;
  }

  const title = "Keep your momentum going";
  const message = `You have not made progress in ${args.daysInactive} day(s). Come back and keep dancing.`;

  await insertInAppNotification({
    userId: args.userId,
    type: "REMINDER",
    title,
    message,
  });

  if (!preferences.emailEnabled || !preferences.inactivityEmail) {
    await insertEmailLog({
      userId: args.userId,
      emailType: "inactivity",
      referenceType: null,
      referenceId: null,
      sentToEmail: user.email,
      status: "skipped",
      subject: title,
      metadata: { reason: "preferences_disabled", daysInactive: args.daysInactive },
    });
    return;
  }

  const alreadySent = await wasRecentlySent({
    userId: args.userId,
    emailType: "inactivity",
    referenceType: null,
    referenceId: null,
    withinHours: 24,
  });

  if (alreadySent) {
    return;
  }

  const email = buildInactivityReminderEmail({
    username: user.username || "Dancer",
    daysInactive: args.daysInactive,
  });

  try {
    await sendNotificationEmail({
      to: user.email,
      subject: email.subject,
      html: email.html,
    });

    await insertEmailLog({
      userId: args.userId,
      emailType: "inactivity",
      referenceType: null,
      referenceId: null,
      sentToEmail: user.email,
      status: "sent",
      subject: email.subject,
      metadata: { daysInactive: args.daysInactive },
    });
  } catch (error: any) {
    await insertEmailLog({
      userId: args.userId,
      emailType: "inactivity",
      referenceType: null,
      referenceId: null,
      sentToEmail: user.email,
      status: "failed",
      subject: email.subject,
      metadata: {
        daysInactive: args.daysInactive,
        error: error?.message || "Unknown error",
      },
    });

    throw error;
  }
}