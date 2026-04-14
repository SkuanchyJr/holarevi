import { db } from "../db";
import { users, restaurants } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getTransporter } from "./emailSender";

function getDashboardUrl(): string {
  return process.env.APP_URL || "https://holarevi.com";
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function starIcons(rating: number): string {
  const filled = "&#9733;";
  const empty = "&#9734;";
  let stars = "";
  for (let i = 1; i <= 5; i++) {
    stars += i <= rating ? filled : empty;
  }
  return stars;
}

function buildReplyNotificationHtml(data: {
  userName: string;
  restaurantName: string;
  reviewerName: string;
  rating: number;
  reviewComment: string;
  postedReply: string;
}): { subject: string; html: string } {
  const { rating } = data;
  const userName = escapeHtml(data.userName);
  const restaurantName = escapeHtml(data.restaurantName);
  const reviewerName = escapeHtml(data.reviewerName);
  const reviewComment = escapeHtml(data.reviewComment);
  const postedReply = escapeHtml(data.postedReply);
  const dashboardUrl = getDashboardUrl();
  const stars = starIcons(rating);
  const truncatedComment = reviewComment.length > 300
    ? reviewComment.substring(0, 300) + "..."
    : reviewComment;

  const subject = `Respuesta publicada en ${restaurantName} — ${reviewerName} (${rating}/5)`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HolaRevi — Respuesta publicada</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f9fc;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f9fc;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:24px 40px;text-align:center;">
              <h1 style="color:#ffffff;font-size:22px;margin:0;">HolaRevi</h1>
              <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:6px 0 0 0;">Respuesta publicada</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <p style="font-size:16px;color:#1a1a2e;margin:0 0 16px 0;">Hola ${userName},</p>
              <p style="font-size:15px;color:#4a4a68;line-height:1.6;margin:0 0 20px 0;">
                Se ha publicado una respuesta a una rese&ntilde;a en <strong>${restaurantName}</strong>.
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
                <tr>
                  <td style="background-color:#f8f9fb;border-radius:8px;padding:20px;border-left:4px solid #e2e8f0;">
                    <p style="font-size:13px;color:#8888a4;margin:0 0 4px 0;text-transform:uppercase;letter-spacing:0.5px;">Rese&ntilde;a de ${reviewerName}</p>
                    <p style="font-size:20px;color:#f59e0b;margin:0 0 8px 0;letter-spacing:2px;">${stars}</p>
                    <p style="font-size:14px;color:#4a4a68;line-height:1.6;margin:0;font-style:italic;">"${truncatedComment || 'Sin comentario'}"</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
                <tr>
                  <td style="background-color:#f0fdf4;border-radius:8px;padding:20px;border-left:4px solid #22c55e;">
                    <p style="font-size:13px;color:#16a34a;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:0.5px;">Tu respuesta</p>
                    <p style="font-size:14px;color:#1a1a2e;line-height:1.6;margin:0;">${postedReply}</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px 0;">
                    <a href="${dashboardUrl}/es/reviews" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">Ver todas tus rese&ntilde;as</a>
                  </td>
                </tr>
              </table>

              <p style="font-size:14px;color:#8888a4;margin:0;line-height:1.5;">
                Un abrazo,<br>
                <strong>El equipo de HolaRevi</strong>
              </p>
            </td>
          </tr>
        </table>
        <p style="font-size:11px;color:#b0b0c0;margin:16px 0 0 0;text-align:center;">
          Este email se env&iacute;a autom&aacute;ticamente cuando HolaRevi publica una respuesta en tu nombre.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

export async function sendReplyNotification(data: {
  restaurantId: string;
  reviewerName: string;
  rating: number;
  reviewComment: string;
  postedReply: string;
}): Promise<void> {
  try {
    try {
      getTransporter();
    } catch {
      console.log("[ReplyNotification] SMTP not configured, skipping notification");
      return;
    }

    const [restaurant] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, data.restaurantId));

    if (!restaurant) {
      console.log(`[ReplyNotification] Restaurant ${data.restaurantId} not found, skipping`);
      return;
    }

    const [owner] = await db
      .select()
      .from(users)
      .where(eq(users.id, restaurant.userId));

    if (!owner || !owner.email) {
      console.log(`[ReplyNotification] No email for user ${restaurant.userId}, skipping`);
      return;
    }

    const userName = owner.firstName || owner.email.split("@")[0];
    const { subject, html } = buildReplyNotificationHtml({
      userName,
      restaurantName: restaurant.name,
      reviewerName: data.reviewerName,
      rating: data.rating,
      reviewComment: data.reviewComment,
      postedReply: data.postedReply,
    });

    const from = process.env.SMTP_FROM || "HolaRevi <info@holarevi.com>";
    const smtp = getTransporter();

    const text = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    await smtp.sendMail({ from, to: owner.email, subject, html, text });
    console.log(`[ReplyNotification] Notification sent to ${owner.email} for restaurant ${restaurant.name}`);
  } catch (error: any) {
    console.error(`[ReplyNotification] Failed to send notification:`, error?.message || error);
  }
}
