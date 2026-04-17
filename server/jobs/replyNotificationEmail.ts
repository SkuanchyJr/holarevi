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
  const filled = "★";
  const empty = "☆";
  let stars = "";
  for (let i = 1; i <= 5; i++) {
    stars += `<span style="color:${i <= rating ? "#F59E0B" : "#D1D5DB"}">${i <= rating ? filled : empty}</span>`;
  }
  return stars;
}

function ratingLabel(rating: number): {
  text: string;
  color: string;
  bg: string;
  border: string;
} {
  if (rating >= 4)
    return {
      text: "Reseña positiva",
      color: "#16A34A",
      bg: "#F0FDF4",
      border: "#22C55E",
    };
  if (rating === 3)
    return {
      text: "Reseña neutra",
      color: "#B45309",
      bg: "#FFFBEB",
      border: "#F59E0B",
    };
  return {
    text: "Reseña negativa",
    color: "#DC2626",
    bg: "#FFF5F5",
    border: "#FF4B4B",
  };
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
  const label = ratingLabel(rating);

  const truncatedComment =
    reviewComment.length > 300
      ? reviewComment.substring(0, 300) + "..."
      : reviewComment;

  const subject = `Respuesta publicada en ${data.restaurantName} — ${data.reviewerName} (${rating}/5)`;

  const html = `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>HolaRevi — Respuesta publicada</title>
  <style>
    * { box-sizing: border-box; }
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    body { margin: 0; padding: 0; width: 100% !important; }
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    body { background-color: #F0F2F5; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    @media screen and (max-width: 600px) {
      .email-wrapper { width: 100% !important; }
      .inner-pad    { padding: 28px 24px !important; }
      .header-pad   { padding: 24px !important; }
      .cta-btn      { display: block !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F0F2F5;">

  <!-- Preheader -->
  <div style="display:none;font-size:1px;color:#F0F2F5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${reviewerName} dejó una reseña de ${rating}/5 en ${restaurantName} · Ya tienes respuesta publicada
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F0F2F5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" class="email-wrapper" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;">

          <!-- ── HEADER ── -->
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                style="background-color:#0D0D0D;border-radius:16px 16px 0 0;padding:28px 40px;"
                class="header-pad">
                <tr>
                  <td>
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td valign="middle" style="padding-right:10px;">
                          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="0" y="0" width="32" height="28" rx="8" fill="#1A1A1A"/>
                            <rect x="0" y="0" width="32" height="28" rx="8" stroke="#333" stroke-width="1"/>
                            <circle cx="11" cy="11" r="2.5" fill="#2B9FE8"/>
                            <circle cx="21" cy="11" r="2.5" fill="#2B9FE8"/>
                            <path d="M9 17 Q16 23 23 17" stroke="#2B9FE8" stroke-width="2.2" stroke-linecap="round" fill="none"/>
                            <path d="M6 28 L2 35 L14 30" fill="#1A1A1A"/>
                          </svg>
                        </td>
                        <td valign="middle">
                          <span style="font-family:'Plus Jakarta Sans',sans-serif;font-size:22px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;">holarevi</span>
                        </td>
                        <td align="right" valign="middle" style="width:100%;">
                          <span style="font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;font-weight:500;color:#666666;letter-spacing:0.5px;text-transform:uppercase;">Respuesta publicada</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── HERO ── -->
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                style="background-color:#0D0D0D;padding:0 40px 36px 40px;" class="inner-pad">
                <tr>
                  <td style="border-top:1px solid #222222;padding-top:32px;">
                    <p style="margin:0 0 8px 0;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:600;color:#2B9FE8;letter-spacing:1px;text-transform:uppercase;">
                      ${restaurantName}
                    </p>
                    <h1 style="margin:0 0 12px 0;font-family:'Plus Jakarta Sans',sans-serif;font-size:28px;font-weight:800;color:#FFFFFF;line-height:1.2;letter-spacing:-0.5px;">
                      Tu respuesta ya está<br>publicada en Google ✓
                    </h1>
                    <p style="margin:0;font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;color:#999999;line-height:1.6;">
                      Hola <strong style="color:#FFFFFF;">${userName}</strong>, HolaRevi ha publicado automáticamente una respuesta a la reseña de <strong style="color:#FFFFFF;">${reviewerName}</strong>.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── RATING BADGE ── -->
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                style="background:linear-gradient(135deg,#1C6FC7 0%,#2B9FE8 100%);padding:20px 40px;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right:16px;">
                          <div style="width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,0.15);text-align:center;line-height:48px;font-family:'Plus Jakarta Sans',sans-serif;font-size:18px;font-weight:800;color:#FFFFFF;">${data.reviewerName.charAt(0).toUpperCase()}</div>
                        </td>
                        <td>
                          <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;font-weight:700;color:#FFFFFF;">${reviewerName}</div>
                          <div style="font-size:18px;letter-spacing:2px;margin-top:2px;">${stars}</div>
                        </td>
                        <td align="right" style="padding-left:24px;">
                          <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:36px;font-weight:800;color:#FFFFFF;line-height:1;">${rating}<span style="font-size:16px;font-weight:500;color:rgba(255,255,255,0.7);">/5</span></div>
                          <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.5px;">${label.text}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── MAIN CONTENT ── -->
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                style="background-color:#FFFFFF;padding:36px 40px;" class="inner-pad">

                <!-- Reseña del cliente -->
                <tr>
                  <td style="padding-bottom:16px;">
                    <p style="margin:0 0 12px 0;font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;font-weight:700;color:#888888;text-transform:uppercase;letter-spacing:1px;">
                      Lo que dijo ${reviewerName}
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                      style="background:${label.bg};border-radius:12px;padding:20px 24px;border-left:4px solid ${label.border};">
                      <tr>
                        <td>
                          <p style="margin:0;font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;color:#444444;line-height:1.7;font-style:italic;">
                            "${truncatedComment || "Sin comentario escrito."}"
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Flecha -->
                <tr>
                  <td align="center" style="padding:4px 0 12px 0;">
                    <div style="font-size:20px;color:#2B9FE8;">↓</div>
                  </td>
                </tr>

                <!-- Respuesta publicada -->
                <tr>
                  <td style="padding-bottom:28px;">
                    <p style="margin:0 0 12px 0;font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;font-weight:700;color:#16A34A;text-transform:uppercase;letter-spacing:1px;">
                      ✓ Tu respuesta publicada
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                      style="background:#F0FDF4;border-radius:12px;padding:20px 24px;border-left:4px solid #22C55E;">
                      <tr>
                        <td>
                          <p style="margin:0;font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;color:#1A1A1A;line-height:1.7;">
                            ${postedReply}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding-bottom:24px;">
                    <div style="height:1px;background:#F0F2F5;"></div>
                  </td>
                </tr>

                <!-- Info tip -->
                <tr>
                  <td style="padding-bottom:28px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                      style="background:linear-gradient(135deg,#EEF6FF 0%,#E0F0FF 100%);border-radius:12px;padding:20px 24px;border:1px solid #C7E0F8;">
                      <tr>
                        <td>
                          <p style="margin:0 0 4px 0;font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;font-weight:700;color:#2B9FE8;text-transform:uppercase;letter-spacing:1px;">
                            💡 ¿Sabías que?
                          </p>
                          <p style="margin:0;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;color:#555555;line-height:1.6;">
                            El <strong>80% de los consumidores</strong> prefiere negocios que responden a todas sus reseñas. Cada respuesta publicada refuerza tu reputación y mejora tu posición en Google Maps.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- CTA -->
                <tr>
                  <td align="center" style="padding-bottom:12px;">
                    <a href="${dashboardUrl}/es/reviews" class="cta-btn"
                      style="display:inline-block;background:#0D0D0D;color:#FFFFFF;font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;font-weight:700;padding:16px 40px;border-radius:10px;text-decoration:none;letter-spacing:0.2px;">
                      Ver todas las reseñas →
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}"
                      style="display:inline-block;color:#2B9FE8;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:600;text-decoration:none;">
                      Ir al panel de HolaRevi
                    </a>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                style="background-color:#0D0D0D;border-radius:0 0 16px 16px;padding:28px 40px;" class="inner-pad">
                <tr>
                  <td>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                      style="border-bottom:1px solid #222222;padding-bottom:20px;margin-bottom:20px;">
                      <tr>
                        <td>
                          <span style="font-family:'Plus Jakarta Sans',sans-serif;font-size:16px;font-weight:800;color:#FFFFFF;">holarevi</span>
                        </td>
                        <td align="right">
                          <a href="${dashboardUrl}/es/reviews" style="font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;color:#666666;text-decoration:none;margin-left:16px;">Reseñas</a>
                          <a href="${dashboardUrl}/es/settings" style="font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;color:#666666;text-decoration:none;margin-left:16px;">Ajustes</a>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td>
                          <p style="margin:0;font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;color:#555555;line-height:1.6;">
                            Este email se envía automáticamente cuando HolaRevi publica una respuesta en tu nombre.<br>
                            <a href="${dashboardUrl}/es/settings/notifications" style="color:#555555;text-decoration:underline;">Gestionar notificaciones</a>
                            &nbsp;·&nbsp;
                            <a href="https://holarevi.com/privacy" style="color:#555555;text-decoration:underline;">Privacidad</a>
                          </p>
                          <p style="margin:8px 0 0 0;font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;color:#444444;">
                            © 2025 HolaRevi · holarevi.com
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr><td height="32"></td></tr>

        </table>
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
    const [restaurant] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, data.restaurantId));

    if (!restaurant) {
      console.log(
        `[ReplyNotification] Restaurant ${data.restaurantId} not found, skipping`,
      );
      return;
    }

    const [owner] = await db
      .select()
      .from(users)
      .where(eq(users.id, restaurant.userId));

    if (!owner || !owner.email) {
      console.log(
        `[ReplyNotification] No email for user ${restaurant.userId}, skipping`,
      );
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
    console.log(
      `[ReplyNotification] Notification sent to ${owner.email} for restaurant ${restaurant.name}`,
    );
  } catch (error: any) {
    console.error(
      `[ReplyNotification] Failed to send notification:`,
      error?.message || error,
    );
  }
}
