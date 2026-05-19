/**
 * trialExpirationTemplates.ts — 3-email sequence sent before the trial ends.
 *
 * Email 1 (trial ends in ~7d): "Tu prueba gratuita termina en 7 días"
 * Email 2 (trial ends in ~3d): "Quedan 3 días — no pierdas el acceso"
 * Email 3 (trial ends in ~1d): "Mañana termina tu prueba, [nombre]"
 */

function getAppUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  return "https://holarevi.com";
}

const BRAND = {
  blue: "#2563EB",
  blueLight: "#38BDF8",
  blueDark: "#1d4ed8",
  bg: "#f4f6f8",
  white: "#ffffff",
  gray100: "#f1f5f9",
  gray200: "#e5e7eb",
  gray500: "#6b7280",
  gray700: "#374151",
  gray900: "#111827",
  amber: "#d97706",
  amberBg: "#fffbeb",
  amberBorder: "#fde68a",
};

function baseLayout(content: string): string {
  const appUrl = getAppUrl();
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>HolaRevi</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:Arial,Helvetica,sans-serif;color:${BRAND.gray900};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0"
        style="max-width:560px;width:100%;background:${BRAND.white};border-radius:12px;border:1px solid ${BRAND.gray200};">

        <tr>
          <td style="padding:24px 32px 0;text-align:left;">
            <span style="font-size:20px;font-weight:700;color:${BRAND.blue};letter-spacing:-0.5px;">HolaRevi</span>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 0;">
            <div style="height:1px;background:${BRAND.gray200};"></div>
          </td>
        </tr>

        ${content}

        <tr>
          <td style="padding:20px 32px 28px;border-top:1px solid ${BRAND.gray100};font-size:11px;color:${BRAND.gray500};text-align:center;line-height:1.6;">
            HolaRevi · Reseñas con IA<br/>
            <a href="${appUrl}/pricing" style="color:${BRAND.blue};text-decoration:none;">Ver planes</a>
            &nbsp;·&nbsp;
            <a href="${appUrl}/unsubscribe" style="color:${BRAND.gray500};text-decoration:none;">Cancelar suscripción a emails</a>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export interface TrialEmailTemplate {
  subject: string;
  preheader: string;
  html: string;
}

// ─── Email 1 (trial ends in ~7d) ──────────────────────────────────────────────

export function buildTrialEmail1(
  firstName: string | null | undefined,
  trialEndsAt: Date
): TrialEmailTemplate {
  const name = firstName || null;
  const appUrl = getAppUrl();
  const pricingUrl = `${appUrl}/pricing`;
  const nfcUrl = `${appUrl}/nfc`;
  const dateStr = trialEndsAt.toLocaleDateString("es-ES", { day: "numeric", month: "long" });

  const subject = `Tu prueba gratuita termina el ${dateStr}`;
  const preheader = "Activa tu plan antes de que se acabe y no pierdas nada de lo que has conseguido.";

  const content = `
    <tr><td style="padding:28px 32px 8px;">
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:${BRAND.gray900};line-height:1.3;">
        ${name ? `Hola ${name},` : "Hola,"}
      </h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND.gray700};">
        Tu prueba gratuita de HolaRevi termina el <strong>${dateStr}</strong>. Quedan 7 días para decidir si quieres seguir con las respuestas automáticas, el panel de reputación y las alertas de reseñas negativas.
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="margin:0 0 24px;background:${BRAND.gray100};border-radius:10px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:${BRAND.gray500};text-transform:uppercase;letter-spacing:1px;">Lo que mantienes al activar</p>
          ${[
            ["✅", "Respuestas automáticas con IA", "en tu tono de marca"],
            ["✅", "Panel de reputación", "todas tus reseñas en un solo lugar"],
            ["✅", "Alertas de reseñas negativas", "para actuar antes de que escalen"],
            ["✅", "Reporte semanal", "métricas de reputación todos los viernes"],
          ].map(([icon, title, desc]) => `
            <p style="margin:10px 0 0;font-size:14px;line-height:1.5;color:${BRAND.gray700};">
              ${icon} <strong>${title}</strong> — ${desc}
            </p>
          `).join("")}
        </td></tr>
      </table>

      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
        <tr>
          <td style="border-radius:8px;background:${BRAND.blue};">
            <a href="${pricingUrl}"
              style="display:inline-block;padding:13px 28px;color:${BRAND.white};text-decoration:none;font-weight:600;font-size:15px;border-radius:8px;">
              → Ver planes y continuar
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.gray500};">
        ¿Quieres multiplicar las reseñas que recibes? El <a href="${nfcUrl}" style="color:${BRAND.blue};text-decoration:none;font-weight:600;">Stand NFC de HolaRevi</a> está disponible con cualquier plan — tus clientes dejan reseñas en segundos solo acercando el móvil.
      </p>
    </td></tr>
  `;

  return { subject, preheader, html: baseLayout(content) };
}

// ─── Email 2 (trial ends in ~3d) ──────────────────────────────────────────────

export function buildTrialEmail2(
  firstName: string | null | undefined,
  trialEndsAt: Date
): TrialEmailTemplate {
  const name = firstName || null;
  const appUrl = getAppUrl();
  const pricingUrl = `${appUrl}/pricing`;
  const dateStr = trialEndsAt.toLocaleDateString("es-ES", { day: "numeric", month: "long" });

  const subject = name
    ? `${name}, quedan 3 días — no pierdas el acceso`
    : `Quedan 3 días — no pierdas el acceso`;
  const preheader = `Tu prueba termina el ${dateStr}. Activa tu plan en menos de 2 minutos.`;

  const content = `
    <tr><td style="padding:28px 32px 8px;">
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:${BRAND.gray900};line-height:1.3;">
        ${name ? `Hola ${name},` : "Hola,"}
      </h1>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="margin:0 0 20px;background:${BRAND.amberBg};border-radius:10px;border:1px solid ${BRAND.amberBorder};">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0;font-size:14px;line-height:1.6;color:${BRAND.gray700};">
            ⏳ <strong>Tu prueba gratuita termina el ${dateStr}.</strong> Quedan 3 días.
          </p>
        </td></tr>
      </table>

      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND.gray700};">
        Cuando termine, HolaRevi dejará de responder reseñas automáticamente. Tus respuestas quedarán pendientes y el panel se pausará.
      </p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${BRAND.gray700};">
        Activar un plan tarda menos de 2 minutos y todo sigue funcionando sin interrupciones.
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
        <tr>
          <td style="border-radius:8px;background:${BRAND.blue};">
            <a href="${pricingUrl}"
              style="display:inline-block;padding:13px 28px;color:${BRAND.white};text-decoration:none;font-weight:600;font-size:15px;border-radius:8px;">
              → Activar mi suscripción
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.gray500};">
        ¿Tienes dudas sobre qué plan es el mejor para tu negocio? Responde este email y te aconsejamos sin compromiso.
      </p>
    </td></tr>
  `;

  return { subject, preheader, html: baseLayout(content) };
}

// ─── Email 3 (trial ends in ~1d) ──────────────────────────────────────────────

export function buildTrialEmail3(
  firstName: string | null | undefined,
  trialEndsAt: Date
): TrialEmailTemplate {
  const name = firstName || null;
  const appUrl = getAppUrl();
  const pricingUrl = `${appUrl}/pricing`;

  const subject = name
    ? `${name}, mañana termina tu prueba de HolaRevi`
    : "Mañana termina tu prueba de HolaRevi";
  const preheader = "Último aviso. Activa tu plan hoy para no perder el acceso.";

  const content = `
    <tr><td style="padding:28px 32px 8px;">
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:${BRAND.gray900};line-height:1.3;">
        ${name ? `Hola ${name},` : "Hola,"}
      </h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND.gray700};">
        Mañana termina tu prueba gratuita. Si no activas un plan antes de que acabe, HolaRevi pausará las respuestas automáticas y el acceso al panel.
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="margin:0 0 24px;border-left:4px solid ${BRAND.blue};background:${BRAND.gray100};border-radius:0 8px 8px 0;">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0;font-size:14px;line-height:1.6;color:${BRAND.gray700};">
            Tienes dos opciones: <strong>activar un plan ahora</strong> (menos de 2 minutos) o dejar que la prueba expire y volver cuando quieras. Si vuelves después, nada se pierde — pero tus reseñas seguirán llegando sin respuesta.
          </p>
        </td></tr>
      </table>

      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
        <tr>
          <td style="border-radius:8px;background:${BRAND.blue};">
            <a href="${pricingUrl}"
              style="display:inline-block;padding:13px 28px;color:${BRAND.white};text-decoration:none;font-weight:600;font-size:15px;border-radius:8px;">
              → Suscribirme ahora
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.gray500};">
        Este es nuestro último aviso antes de que expire la prueba.
      </p>
    </td></tr>
  `;

  return { subject, preheader, html: baseLayout(content) };
}
