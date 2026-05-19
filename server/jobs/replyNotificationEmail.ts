import { db } from "../db";
import { users, restaurants } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getTransporter } from "./emailSender";

// ─── Brand ───────────────────────────────────────────────────────────────────

const BRAND = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  accent: "#38BDF8",
  ink: "#0F172A",
  inkSoft: "#334155",
  muted: "#64748B",
  line: "#E2E8F0",
  bg: "#F1F5F9",
  card: "#FFFFFF",
  success: "#10B981",
  successBg: "#ECFDF5",
  warn: "#F59E0B",
  warnBg: "#FFFBEB",
  danger: "#EF4444",
  dangerBg: "#FEF2F2",
};

function getDashboardUrl(): string {
  return process.env.APP_URL || "https://holarevi.com";
}

function escapeHtml(str: string): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Renders 5 unicode stars, filled ones in warn color, empty in line color. */
function starIcons(rating: number): string {
  const filled = "&#9733;";
  const empty = "&#9734;";
  const safeRating = Math.max(0, Math.min(5, Math.round(rating || 0)));
  let stars = "";
  for (let i = 1; i <= 5; i++) {
    const isFilled = i <= safeRating;
    const color = isFilled ? BRAND.warn : BRAND.line;
    stars += `<span style="color:${color};">${isFilled ? filled : empty}</span>`;
  }
  return stars;
}

/**
 * Returns contextual info based on rating bucket:
 * positive (4-5), neutral (3), negative (1-2).
 */
function getRatingContext(rating: number): {
  label: string;
  accent: string;
  bg: string;
  border: string;
  insight: string;
} {
  if (rating >= 4) {
    return {
      label: "Reseña positiva",
      accent: BRAND.success,
      bg: BRAND.successBg,
      border: BRAND.success,
      insight:
        "Responder a reseñas positivas multiplica la confianza pública. El 80% de consumidores prefiere negocios que responden a todas sus reseñas, no solo a las malas.",
    };
  }
  if (rating === 3) {
    return {
      label: "Reseña neutra",
      accent: BRAND.warn,
      bg: BRAND.warnBg,
      border: BRAND.warn,
      insight:
        "Las reseñas de 3 estrellas son una oportunidad: muchos clientes leen justamente estas para formarse una opinión. Una buena respuesta puede convertirla en señal positiva.",
    };
  }
  return {
    label: "Reseña negativa",
    accent: BRAND.danger,
    bg: BRAND.dangerBg,
    border: BRAND.danger,
    insight:
      "Responder de forma profesional a una reseña negativa cambia cómo la lee el siguiente cliente. Te posiciona como un negocio que escucha y gestiona, no que ignora.",
  };
}

/** Footer common to all notification emails. */
function buildFooter(userEmail: string): string {
  const safeEmail = escapeHtml(userEmail);
  const dashboardUrl = getDashboardUrl();
  return `
    <tr>
      <td style="padding:24px 40px 8px 40px;border-top:1px solid ${BRAND.line};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${BRAND.muted};line-height:1.6;">
              <p style="margin:0 0 8px 0;">
                Recibes este email porque HolaRevi publicó una respuesta en tu nombre. Cuenta asociada a <strong style="color:${BRAND.inkSoft};">${safeEmail}</strong>.
              </p>
              <p style="margin:0 0 8px 0;">
                <a href="${dashboardUrl}/es/settings/notifications" style="color:${BRAND.primary};text-decoration:none;">Gestionar notificaciones</a>
                &nbsp;·&nbsp;
                <a href="${dashboardUrl}/es/reviews" style="color:${BRAND.primary};text-decoration:none;">Ver todas las reseñas</a>
                &nbsp;·&nbsp;
                <a href="${dashboardUrl}/es/support" style="color:${BRAND.primary};text-decoration:none;">Soporte</a>
              </p>
              <p style="margin:0;color:#94A3B8;font-size:11px;">
                © ${new Date().getFullYear()} HolaRevi · Reputación y atención al cliente para negocios locales.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

/** Branded header with logo mark. */
function buildHeader(subtitle: string): string {
  return `
    <tr>
      <td style="background:${BRAND.primary};background:linear-gradient(135deg, ${BRAND.primaryDark} 0%, ${BRAND.primary} 60%, ${BRAND.accent} 130%);padding:24px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align:middle;">
              <span style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">holarevi</span>
            </td>
            <td align="right" style="vertical-align:middle;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:rgba(255,255,255,0.9);text-transform:uppercase;letter-spacing:1px;font-weight:600;">
              ${escapeHtml(subtitle)}
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

// ─── Main HTML builder ───────────────────────────────────────────────────────

function buildReplyNotificationHtml(data: {
  userName: string;
  userEmail: string;
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
  const truncatedComment =
    reviewComment.length > 400
      ? reviewComment.substring(0, 400) + "…"
      : reviewComment;

  const ctx = getRatingContext(rating);
  const publishedAt = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const subject = `Respuesta publicada en ${data.restaurantName} — ${data.reviewerName} (${rating}/5)`;
  const preheader = `${ctx.label} de ${data.reviewerName} respondida automáticamente · ${data.restaurantName}`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>HolaRevi — Respuesta publicada</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:Arial,Helvetica,sans-serif;">

  <!-- Preheader (hidden preview text in inbox) -->
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${BRAND.bg};opacity:0;">
    ${escapeHtml(preheader)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bg};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:${BRAND.card};border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">

          ${buildHeader("Respuesta publicada")}

          <!-- Status banner -->
          <tr>
            <td style="background-color:${ctx.bg};padding:12px 40px;border-bottom:1px solid ${BRAND.line};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${ctx.accent};font-weight:700;">
                    ✓ Respuesta publicada correctamente
                  </td>
                  <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${BRAND.muted};">
                    ${escapeHtml(publishedAt)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="padding:28px 40px 8px 40px;">
              <p style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:${BRAND.ink};margin:0 0 4px 0;">Hola ${userName},</p>
              <h2 style="font-family:Arial,Helvetica,sans-serif;font-size:20px;color:${BRAND.ink};line-height:1.35;margin:12px 0 8px 0;font-weight:700;">
                Acabamos de publicar una respuesta en <span style="color:${BRAND.primary};">${restaurantName}</span>
              </h2>
              <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${BRAND.inkSoft};line-height:1.6;margin:0 0 8px 0;">
                HolaRevi ha respondido automáticamente a una reseña en Google siguiendo las reglas que configuraste. Aquí tienes el detalle para que lo revises.
              </p>
            </td>
          </tr>

          <!-- Review card -->
          <tr>
            <td style="padding:12px 40px 8px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;border-radius:10px;border:1px solid ${BRAND.line};">
                <tr>
                  <td style="padding:20px 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${BRAND.muted};margin:0 0 6px 0;text-transform:uppercase;letter-spacing:1px;font-weight:700;">Reseña original</p>
                          <p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:${BRAND.ink};margin:0 0 4px 0;font-weight:700;">${reviewerName}</p>
                          <p style="font-family:Arial,Helvetica,sans-serif;font-size:20px;margin:0 0 12px 0;letter-spacing:3px;line-height:1;">${stars} <span style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${BRAND.muted};font-weight:600;letter-spacing:0;">&nbsp;${rating}/5</span></p>
                        </td>
                        <td align="right" style="vertical-align:top;">
                          <span style="display:inline-block;background-color:${ctx.accent};color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;padding:4px 10px;border-radius:12px;text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(ctx.label)}</span>
                        </td>
                      </tr>
                    </table>
                    <p style="font-family:Georgia,'Times New Roman',serif;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;margin:8px 0 0 0;font-style:italic;border-left:3px solid ${BRAND.line};padding-left:14px;">
                      &ldquo;${truncatedComment || "Reseña sin comentario de texto."}&rdquo;
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Our reply -->
          <tr>
            <td style="padding:16px 40px 8px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.successBg};border-radius:10px;border-left:4px solid ${BRAND.success};">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${BRAND.success};margin:0 0 8px 0;text-transform:uppercase;letter-spacing:1px;font-weight:700;">Respuesta publicada en tu nombre</p>
                    <p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:${BRAND.ink};line-height:1.65;margin:0;">
                      ${postedReply}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Why it matters -->
          <tr>
            <td style="padding:16px 40px 8px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;border-radius:10px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${BRAND.muted};margin:0 0 6px 0;text-transform:uppercase;letter-spacing:1px;font-weight:700;">Por qué importa</p>
                    <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${BRAND.inkSoft};line-height:1.6;margin:0;">
                      ${escapeHtml(ctx.insight)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Actions -->
          <tr>
            <td style="padding:24px 40px 8px 40px;">
              <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${BRAND.muted};margin:0 0 12px 0;text-transform:uppercase;letter-spacing:1px;font-weight:700;">¿Qué puedes hacer ahora?</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 0 10px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background-color:${BRAND.primary};border-radius:8px;">
                          <a href="${dashboardUrl}/es/reviews" style="display:inline-block;padding:12px 22px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">Ver la reseña en mi dashboard</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${BRAND.inkSoft};line-height:1.8;padding-top:6px;">
                    · <a href="${dashboardUrl}/es/reviews" style="color:${BRAND.primary};text-decoration:none;font-weight:600;">Editar la respuesta</a> si quieres matizarla (seguirá visible en Google).<br>
                    · <a href="${dashboardUrl}/es/settings/rules" style="color:${BRAND.primary};text-decoration:none;font-weight:600;">Ajustar reglas de auto-publicación</a> si prefieres revisar antes de publicar.<br>
                    · <a href="${dashboardUrl}/es/settings/tone" style="color:${BRAND.primary};text-decoration:none;font-weight:600;">Afinar el tono de marca</a> para futuras respuestas.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Signature -->
          <tr>
            <td style="padding:20px 40px 24px 40px;">
              <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${BRAND.inkSoft};margin:0;line-height:1.6;">
                Un abrazo,<br>
                <strong style="color:${BRAND.ink};">El equipo de HolaRevi</strong>
              </p>
            </td>
          </tr>

          ${buildFooter(data.userEmail)}

        </table>

        <!-- Secondary note outside main card -->
        <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#94A3B8;margin:16px 0 0 0;text-align:center;max-width:600px;line-height:1.5;">
          Este email se envía automáticamente cuando HolaRevi publica una respuesta en tu nombre.<br>
          Si no reconoces esta actividad, contacta con nuestro soporte.
        </p>

      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

// ─── Public API ──────────────────────────────────────────────────────────────

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
      userEmail: owner.email,
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
