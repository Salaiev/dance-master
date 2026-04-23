import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendNotificationEmail({
  to,
  subject,
  html,
  text,
}: SendEmailArgs) {
  const from = process.env.EMAIL_FROM;

  if (!process.env.RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY");
  }

  if (!from) {
    throw new Error("Missing EMAIL_FROM");
  }

  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    subject,
    html,
    text,
  });

  if (error) {
    throw new Error(error.message || "Failed to send email");
  }

  return data;
}

/* =========================
   EMAIL TEMPLATES
========================= */

export function buildChallengeCompletedEmail({
  username,
  challengeTitle,
}: {
  username: string;
  challengeTitle: string;
}) {
  return {
    subject: `Challenge completed: ${challengeTitle}`,
    html: `
      <div style="font-family: Arial; line-height: 1.6;">
        <h2>Nice work, ${username}!</h2>
        <p>You completed the challenge <strong>${challengeTitle}</strong>.</p>
        <p>Keep going — you're making real progress 💪</p>
      </div>
    `,
  };
}

export function buildBadgeEarnedEmail({
  username,
  badgeTitle,
  badgeDescription,
}: {
  username: string;
  badgeTitle: string;
  badgeDescription: string;
}) {
  return {
    subject: `You earned a badge: ${badgeTitle}`,
    html: `
      <div style="font-family: Arial; line-height: 1.6;">
        <h2>Congrats, ${username}!</h2>
        <p>You earned the badge <strong>${badgeTitle}</strong>.</p>
        <p>${badgeDescription}</p>
      </div>
    `,
  };
}

export function buildInactivityReminderEmail({
  username,
  daysInactive,
}: {
  username: string;
  daysInactive: number;
}) {
  return {
    subject: `We miss you at Dance Master`,
    html: `
      <div style="font-family: Arial; line-height: 1.6;">
        <h2>Hey ${username},</h2>
        <p>You haven’t practiced in <strong>${daysInactive} days</strong>.</p>
        <p>Jump back in and keep improving your skills 💃</p>
      </div>
    `,
  };
}