/**
 * emailSender.ts — Nodemailer SMTP email sender for weekly analytics
 *
 * Required env vars:
 *   - SMTP_HOST
 *   - SMTP_PORT
 *   - SMTP_USER
 *   - SMTP_PASS
 *   - SMTP_FROM (e.g. "HolaRevi <info@holarevi.com>")
 */
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// ─── Types ───────────────────────────────────────────────────────────────────
export interface SendResult {
  success: boolean;
  error?: string;
}

export interface WeeklyEmailData {
  // Periodo
  weekRange: string; // e.g. "10 al 16 de junio"
  heroMessage: string; // e.g. "Tu negocio tuvo una buena semana 👋"

  // KPIs
  newReviews: number;
  newReviewsDelta: string; // e.g. "↑ 4 vs semana anterior"
  averageScore: number; // e.g. 4.8
  respondedCount: number; // e.g. 9
  totalCount: number; // e.g. 12
  pendingCount: number; // e.g. 3

  // Métricas de rendimiento
  responseRate: number; // e.g. 75 (percentage)
  responseRateTrend: string; // e.g. "→ igual" | "↑ 10%" | "↓ 5%"
  scoreChange: string; // e.g. "↑ 0.1"

  // Reseñas pendientes (hasta 2)
  pendingReviews: PendingReview[];

  // URLs
  dashboardUrl: string;
  respondUrl: string;
  respondPendingUrl: string;
  reviewsUrl: string;
  settingsUrl: string;
  unsubscribeUrl: string;
}

export interface PendingReview {
  authorInitial: string; // e.g. "M"
  authorName: string; // e.g. "María García"
  timeAgo: string; // e.g. "Hace 2 días"
  stars: number; // 1–5
  text: string;
  isNegative: boolean; // drives color/badge
}

// ─── HTML Builder ─────────────────────────────────────────────────────────────
function buildStarString(stars: number): string {
  return "★".repeat(stars) + "☆".repeat(5 - stars);
}

function buildReviewCard(review: PendingReview, respondUrl: string): string {
  const borderColor = review.isNegative ? "#FF4B4B" : "#22C55E";
  const bgColor = review.isNegative ? "#FFF5F5" : "#F5FFF8";
  const badgeBg = review.isNegative ? "#FF4B4B" : "#DCFCE7";
  const badgeColor = review.isNegative ? "#FFFFFF" : "#16A34A";
  const badgeText = review.isNegative ? "Urgente" : "Sin respuesta";
  const avatarBg = review.isNegative ? "#FF4B4B" : "#22C55E";

  return `
    <tr>
      <td class="review-card" style="background:${bgColor};border-radius:12px;padding:20px 24px;border-left:4px solid ${borderColor};display:block;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:8px;">
                    <div style="width:36px;height:36px;border-radius:50%;background:${avatarBg};text-align:center;line-height:36px;font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;font-weight:700;color:#FFFFFF;">${review.authorInitial}</div>
                  </td>
                  <td>
                    <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;font-weight:700;color:#0D0D0D;">${review.authorName}</div>
                    <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;color:#888888;">${review.timeAgo} · ${buildStarString(review.stars)}</div>
                  </td>
                  <td align="right" valign="top">
                    <span style="display:inline-block;background:${badgeBg};color:${badgeColor};font-family:'Plus Jakarta Sans',sans-serif;font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">${badgeText}</span>
                  </td>
                </tr>
              </table>
              <p style="margin:12px 0 16px 0;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;color:#444444;line-height:1.6;font-style:italic;">
                "${review.text}"
              </p>
              <a href="${respondUrl}" style="display:inline-block;background:#0D0D0D;color:#FFFFFF;font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;font-weight:700;padding:10px 20px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;">
                Responder ahora →
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr><td height="10"></td></tr>
  `;
}

function buildProgressBar(percent: number): string {
  const clamped = Math.min(100, Math.max(0, percent));
  return `
    <div style="margin-top:8px;background:#E8EAED;border-radius:4px;height:6px;width:100%;">
      <div style="background:#2B9FE8;border-radius:4px;height:6px;width:${clamped}%;"></div>
    </div>
  `;
}

function buildWeeklyEmailHtml(data: WeeklyEmailData): string {
  const reviewCards = data.pendingReviews
    .map((r) => buildReviewCard(r, data.respondUrl))
    .join("");

  const scorePercent = (data.averageScore / 5) * 100;

  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>Tu resumen semanal · HolaRevi</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    * { box-sizing: border-box; }
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; }
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    body {
      background-color: #F0F2F5;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    @media screen and (max-width: 600px) {
      .email-wrapper { width: 100% !important; }
      .email-body { padding: 0 16px !important; }
      .stat-cell { display: block !important; width: 100% !important; padding: 16px 0 !important; }
      .stat-divider { display: none !important; }
      .cta-button { display: block !important; text-align: center !important; }
      .review-card { padding: 20px !important; }
      .header-logo { font-size: 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F0F2F5;">

  <div style="display:none;font-size:1px;color:#F0F2F5;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    Esta semana tuviste ${data.newReviews} nuevas reseñas · Tu puntuación es ${data.averageScore} ⭐ · Revisa lo más importante
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F0F2F5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" class="email-wrapper" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;">

          <!-- HEADER -->
          <tr>
            <td style="padding-bottom:0;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                style="background-color:#0D0D0D;border-radius:16px 16px 0 0;padding:28px 40px;">
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
                          <span class="header-logo" style="font-family:'Plus Jakarta Sans',sans-serif;font-size:22px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;">holarevi</span>
                        </td>
                        <td align="right" valign="middle" style="width:100%;">
                          <span style="font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;font-weight:500;color:#666666;letter-spacing:0.5px;text-transform:uppercase;">Resumen semanal</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- HERO -->
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                style="background-color:#0D0D0D;padding:0 40px 36px 40px;">
                <tr>
                  <td style="border-top:1px solid #222222;padding-top:32px;">
                    <p style="margin:0 0 8px 0;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:600;color:#2B9FE8;letter-spacing:1px;text-transform:uppercase;">
                      Semana del ${data.weekRange}
                    </p>
                    <h1 style="margin:0 0 12px 0;font-family:'Plus Jakarta Sans',sans-serif;font-size:30px;font-weight:800;color:#FFFFFF;line-height:1.2;letter-spacing:-0.5px;">
                      ${data.heroMessage}
                    </h1>
                    <p style="margin:0;font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;font-weight:400;color:#999999;line-height:1.6;">
                      Aquí tienes lo más relevante de la semana: reseñas, respuestas y oportunidades que no deberías perderte.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- KPI BAR -->
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                style="background:linear-gradient(135deg,#1C6FC7 0%,#2B9FE8 100%);padding:28px 40px;">
                <tr>
                  <td class="stat-cell" align="center" style="width:33%;padding:0 12px;border-right:1px solid rgba(255,255,255,0.2);">
                    <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:36px;font-weight:800;color:#FFFFFF;line-height:1;">${data.newReviews}</div>
                    <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;font-weight:500;color:rgba(255,255,255,0.75);margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;">Nuevas reseñas</div>
                    <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;color:rgba(255,255,255,0.55);margin-top:2px;">${data.newReviewsDelta}</div>
                  </td>
                  <td class="stat-divider" width="1" style="background:rgba(255,255,255,0.2);"></td>
                  <td class="stat-cell" align="center" style="width:33%;padding:0 12px;border-right:1px solid rgba(255,255,255,0.2);">
                    <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:36px;font-weight:800;color:#FFFFFF;line-height:1;">${data.averageScore}</div>
                    <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;font-weight:500;color:rgba(255,255,255,0.75);margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;">Puntuación media</div>
                    <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;color:rgba(255,255,255,0.55);margin-top:2px;">⭐ Google</div>
                  </td>
                  <td class="stat-divider" width="1" style="background:rgba(255,255,255,0.2);"></td>
                  <td class="stat-cell" align="center" style="width:33%;padding:0 12px;">
                    <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:36px;font-weight:800;color:#FFFFFF;line-height:1;">${data.respondedCount}/${data.totalCount}</div>
                    <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;font-weight:500;color:rgba(255,255,255,0.75);margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;">Respondidas</div>
                    <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;color:rgba(255,255,255,0.55);margin-top:2px;">${data.pendingCount} pendientes</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- MAIN CONTENT -->
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                style="background-color:#FFFFFF;padding:36px 40px;">

                <!-- Reseñas pendientes -->
                <tr>
                  <td style="padding-bottom:28px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td>
                          <h2 style="margin:0 0 4px 0;font-family:'Plus Jakarta Sans',sans-serif;font-size:18px;font-weight:700;color:#0D0D0D;letter-spacing:-0.3px;">
                            ⚡ Reseñas pendientes de respuesta
                          </h2>
                          <p style="margin:0 0 20px 0;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;color:#888888;">
                            Responder rápido mejora tu posición en Google. Hazlo antes de que pasen 48h.
                          </p>
                        </td>
                      </tr>
                      ${reviewCards}
                    </table>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding-bottom:28px;">
                    <div style="height:1px;background:#F0F2F5;"></div>
                  </td>
                </tr>

                <!-- Métricas -->
                <tr>
                  <td style="padding-bottom:28px;">
                    <h2 style="margin:0 0 4px 0;font-family:'Plus Jakarta Sans',sans-serif;font-size:18px;font-weight:700;color:#0D0D0D;letter-spacing:-0.3px;">
                      📊 Rendimiento de la semana
                    </h2>
                    <p style="margin:0 0 20px 0;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;color:#888888;">
                      Comparado con los 7 días anteriores.
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding-bottom:14px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                            style="background:#F8F9FB;border-radius:10px;padding:14px 18px;">
                            <tr>
                              <td>
                                <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:600;color:#0D0D0D;">Nuevas reseñas recibidas</div>
                                ${buildProgressBar(Math.min(100, (data.newReviews / 20) * 100))}
                              </td>
                              <td align="right" valign="top" style="padding-left:16px;white-space:nowrap;">
                                <span style="font-family:'Plus Jakarta Sans',sans-serif;font-size:20px;font-weight:800;color:#0D0D0D;">${data.newReviews}</span>
                                <span style="font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;font-weight:600;color:#22C55E;margin-left:4px;">${data.newReviewsDelta}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom:14px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                            style="background:#F8F9FB;border-radius:10px;padding:14px 18px;">
                            <tr>
                              <td>
                                <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:600;color:#0D0D0D;">Tasa de respuesta</div>
                                ${buildProgressBar(data.responseRate)}
                              </td>
                              <td align="right" valign="top" style="padding-left:16px;white-space:nowrap;">
                                <span style="font-family:'Plus Jakarta Sans',sans-serif;font-size:20px;font-weight:800;color:#0D0D0D;">${data.responseRate}%</span>
                                <span style="font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;font-weight:600;color:#F59E0B;margin-left:4px;">${data.responseRateTrend}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                            style="background:#F8F9FB;border-radius:10px;padding:14px 18px;">
                            <tr>
                              <td>
                                <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:600;color:#0D0D0D;">Puntuación media Google</div>
                                ${buildProgressBar(scorePercent)}
                              </td>
                              <td align="right" valign="top" style="padding-left:16px;white-space:nowrap;">
                                <span style="font-family:'Plus Jakarta Sans',sans-serif;font-size:20px;font-weight:800;color:#0D0D0D;">${data.averageScore}</span>
                                <span style="font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;font-weight:600;color:#22C55E;margin-left:4px;">${data.scoreChange}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding-bottom:28px;">
                    <div style="height:1px;background:#F0F2F5;"></div>
                  </td>
                </tr>

                <!-- Tip semanal -->
                <tr>
                  <td style="padding-bottom:28px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                      style="background:linear-gradient(135deg,#EEF6FF 0%,#E0F0FF 100%);border-radius:12px;padding:24px 28px;border:1px solid #C7E0F8;">
                      <tr>
                        <td>
                          <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;font-weight:700;color:#2B9FE8;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">
                            💡 Consejo de esta semana
                          </div>
                          <h3 style="margin:0 0 8px 0;font-family:'Plus Jakarta Sans',sans-serif;font-size:16px;font-weight:700;color:#0D0D0D;line-height:1.3;">
                            Responde las reseñas negativas antes de las 24h
                          </h3>
                          <p style="margin:0;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;color:#555555;line-height:1.6;">
                            Los negocios que responden reseñas negativas en menos de 24 horas recuperan hasta el <strong>70% de la confianza</strong> de clientes potenciales que leen esas reseñas. Usa la IA de HolaRevi para generar una respuesta empática en segundos.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- CTAs -->
                <tr>
                  <td align="center" style="padding-bottom:12px;">
                    <a href="${data.dashboardUrl}" class="cta-button"
                      style="display:inline-block;background:#0D0D0D;color:#FFFFFF;font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;font-weight:700;padding:16px 40px;border-radius:10px;text-decoration:none;letter-spacing:0.2px;">
                      Ver mi panel completo →
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom:8px;">
                    <a href="${data.respondPendingUrl}"
                      style="display:inline-block;color:#2B9FE8;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:600;text-decoration:none;">
                      Responder las ${data.pendingCount} reseñas pendientes
                    </a>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                style="background-color:#0D0D0D;border-radius:0 0 16px 16px;padding:28px 40px;">
                <tr>
                  <td>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                      style="border-bottom:1px solid #222222;padding-bottom:20px;margin-bottom:20px;">
                      <tr>
                        <td>
                          <span style="font-family:'Plus Jakarta Sans',sans-serif;font-size:16px;font-weight:800;color:#FFFFFF;">holarevi</span>
                        </td>
                        <td align="right">
                          <a href="${data.dashboardUrl}" style="font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;color:#666666;text-decoration:none;margin-left:16px;">Panel</a>
                          <a href="${data.reviewsUrl}" style="font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;color:#666666;text-decoration:none;margin-left:16px;">Reseñas</a>
                          <a href="${data.settingsUrl}" style="font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;color:#666666;text-decoration:none;margin-left:16px;">Ajustes</a>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td>
                          <p style="margin:0;font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;color:#555555;line-height:1.6;">
                            Recibes este email porque tienes activados los resúmenes semanales en tu cuenta de HolaRevi.<br>
                            <a href="${data.unsubscribeUrl}" style="color:#555555;text-decoration:underline;">Cambiar frecuencia</a>
                            &nbsp;·&nbsp;
                            <a href="${data.unsubscribeUrl}" style="color:#555555;text-decoration:underline;">Darse de baja</a>
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
}

// ─── Transporter (lazy singleton) ────────────────────────────────────────────
let transporter: Transporter | null = null;

export function getTransporter(): Transporter {
  if (!transporter) {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      throw new Error(
        "SMTP_HOST, SMTP_USER, and SMTP_PASS are required for email sending",
      );
    }

    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return transporter;
}

// ─── Send function ────────────────────────────────────────────────────────────
/**
 * Send a weekly analytics email via SMTP.
 * Accepts either a pre-built HTML string or a WeeklyEmailData object.
 * Includes 1 retry on failure.
 */
export async function sendWeeklyEmail(
  to: string,
  subject: string,
  htmlOrData: string | WeeklyEmailData,
): Promise<SendResult> {
  const from = process.env.SMTP_FROM || "HolaRevi <info@holarevi.com>";
  const html =
    typeof htmlOrData === "string"
      ? htmlOrData
      : buildWeeklyEmailHtml(htmlOrData);

  const maxRetries = 2;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `[WeeklyEmail] Sending email to ${to} (attempt ${attempt}/${maxRetries})`,
      );

      const smtp = getTransporter();

      const text = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      await smtp.sendMail({ from, to, subject, html, text });

      console.log(`[WeeklyEmail] Email sent successfully to ${to}`);
      return { success: true };
    } catch (error: any) {
      console.error(
        `[WeeklyEmail] SMTP error sending to ${to} (attempt ${attempt}/${maxRetries}):`,
        error?.message || error,
      );
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
      return {
        success: false,
        error: error?.message || "Unknown SMTP error",
      };
    }
  }

  return { success: false, error: "Max retries exceeded" };
}

// ─── Usage example ────────────────────────────────────────────────────────────
/*
await sendWeeklyEmail("cliente@example.com", "Tu resumen semanal · HolaRevi", {
  weekRange: "10 al 16 de junio",
  heroMessage: "Tu negocio tuvo una buena semana 👋",
  newReviews: 12,
  newReviewsDelta: "↑ 4 vs semana anterior",
  averageScore: 4.8,
  respondedCount: 9,
  totalCount: 12,
  pendingCount: 3,
  responseRate: 75,
  responseRateTrend: "→ igual",
  scoreChange: "↑ 0.1",
  pendingReviews: [
    {
      authorInitial: "M",
      authorName: "María García",
      timeAgo: "Hace 2 días",
      stars: 2,
      text: "El servicio tardó demasiado y nadie nos explicó los tiempos de espera.",
      isNegative: true,
    },
    {
      authorInitial: "J",
      authorName: "Javier Ruiz",
      timeAgo: "Hace 3 días",
      stars: 5,
      text: "Increíble experiencia. El equipo fue muy atento y el ambiente es perfecto.",
      isNegative: false,
    },
  ],
  dashboardUrl: "https://app.holarevi.com/dashboard",
  respondUrl: "https://app.holarevi.com/reviews",
  respondPendingUrl: "https://app.holarevi.com/reviews?filter=pending",
  reviewsUrl: "https://app.holarevi.com/reviews",
  settingsUrl: "https://app.holarevi.com/settings",
  unsubscribeUrl: "https://app.holarevi.com/unsubscribe",
});
*/
