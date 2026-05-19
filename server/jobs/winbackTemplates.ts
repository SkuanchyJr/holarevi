/**
 * winbackTemplates.ts — 3-email win-back sequence for canceled/past_due users.
 *
 * Email 1 (+3d after sequence start):  "¿Qué pasó, [nombre]?"
 * Email 2 (+14d after email 1):        "Lo nuevo en HolaRevi desde que te fuiste"
 * Email 3 (+30d after email 1):        "Última vez que te escribimos — vuelve con descuento"
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

export interface WinbackEmailTemplate {
  subject: string;
  preheader: string;
  html: string;
}

// ─── Email 1 (soft check-in) ──────────────────────────────────────────────────

export function buildWinbackEmail1(
  firstName: string | null | undefined
): WinbackEmailTemplate {
  const name = firstName || null;
  const appUrl = getAppUrl();
  const contactUrl = `${appUrl}/contact`;
  const pricingUrl = `${appUrl}/pricing`;

  const subject = name ? `${name}, ¿qué pasó?` : "¿Qué pasó?";
  const preheader = "Tu cuenta de HolaRevi se canceló. Si fue algo nuestro, queremos saberlo.";

  const content = `
    <tr><td style="padding:28px 32px 8px;">
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:${BRAND.gray900};line-height:1.3;">
        ${name ? `Hola ${name},` : "Hola,"}
      </h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND.gray700};">
        Vimos que tu suscripción a HolaRevi se canceló. No pasa nada — pero si hubo algo que no funcionó como esperabas, o si fue una cuestión de precio o de tiempo, queremos saberlo.
      </p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${BRAND.gray700};">
        ¿Fue algo nuestro? ¿Algo del producto? ¿O simplemente no era el momento? Una respuesta tuya, aunque sea una línea, nos ayuda más de lo que crees.
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
        <tr>
          <td style="border-radius:8px;background:${BRAND.blue};">
            <a href="${contactUrl}"
              style="display:inline-block;padding:13px 28px;color:${BRAND.white};text-decoration:none;font-weight:600;font-size:15px;border-radius:8px;">
              → Cuéntanos qué pasó
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:${BRAND.gray500};">
        Si quieres volver en algún momento, tu cuenta sigue aquí.
        <a href="${pricingUrl}" style="color:${BRAND.blue};text-decoration:none;font-weight:600;">Ver planes →</a>
      </p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.gray500};">
        También puedes responder directamente a este email. Lo leeremos.
      </p>
    </td></tr>
  `;

  return { subject, preheader, html: baseLayout(content) };
}

// ─── Email 2 (value reminder) ─────────────────────────────────────────────────

export function buildWinbackEmail2(
  firstName: string | null | undefined
): WinbackEmailTemplate {
  const name = firstName || null;
  const appUrl = getAppUrl();
  const pricingUrl = `${appUrl}/pricing`;
  const nfcUrl = `${appUrl}/nfc`;

  const subject = "Lo nuevo en HolaRevi desde que te fuiste";
  const preheader = "Mejoras que puede que cambien tu decisión.";

  const content = `
    <tr><td style="padding:28px 32px 8px;">
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:${BRAND.gray900};line-height:1.3;">
        ${name ? `Hola ${name},` : "Hola,"}
      </h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND.gray700};">
        Han pasado unas semanas desde que dejaste HolaRevi. No te vamos a bombardear, pero sí queremos contarte algunas cosas que hemos mejorado.
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="margin:0 0 24px;background:${BRAND.gray100};border-radius:10px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:${BRAND.gray500};text-transform:uppercase;letter-spacing:1px;">Novedades recientes</p>
          ${[
            ["🤖", "Respuestas más naturales", "El modelo de IA se actualiza continuamente para sonar más humano y menos genérico."],
            ["📊", "Reportes semanales mejorados", "Más métricas, mejor formato, resúmenes de tendencias que antes no existían."],
            ["🏷️", "Stand NFC disponible", "Complemento físico para que tus clientes dejen reseñas en 10 segundos — sin apps."],
            ["⚡", "Reglas de auto-publicación", "Control granular sobre qué reseñas se responden automáticamente y cuáles se revisan primero."],
          ].map(([icon, title, desc]) => `
            <p style="margin:10px 0 0;font-size:14px;line-height:1.5;color:${BRAND.gray700};">
              ${icon} <strong>${title}</strong> — ${desc}
            </p>
          `).join("")}
        </td></tr>
      </table>

      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
        <tr>
          <td style="border-radius:8px;background:${BRAND.blue};">
            <a href="${pricingUrl}"
              style="display:inline-block;padding:13px 28px;color:${BRAND.white};text-decoration:none;font-weight:600;font-size:15px;border-radius:8px;">
              → Ver los planes
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.gray500};">
        ¿Te interesa el stand físico? <a href="${nfcUrl}" style="color:${BRAND.blue};text-decoration:none;font-weight:600;">Ver el Stand NFC →</a>
      </p>
    </td></tr>
  `;

  return { subject, preheader, html: baseLayout(content) };
}

// ─── Email 3 (last chance + offer) ───────────────────────────────────────────

export function buildWinbackEmail3(
  firstName: string | null | undefined,
  promoCode: string
): WinbackEmailTemplate {
  const name = firstName || null;
  const appUrl = getAppUrl();
  const pricingUrl = `${appUrl}/pricing?promo=${promoCode}`;

  const subject = name
    ? `${name}, última vez que te escribimos — vuelve con un mes gratis`
    : "Última vez que te escribimos — vuelve con un mes gratis";
  const preheader = `Usa el código ${promoCode} al activar tu plan. Solo por tiempo limitado.`;

  const content = `
    <tr><td style="padding:28px 32px 8px;">
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:${BRAND.gray900};line-height:1.3;">
        ${name ? `Hola ${name},` : "Hola,"}
      </h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND.gray700};">
        Este es el último email que te enviamos sobre volver a HolaRevi. Queremos hacerlo fácil:
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="margin:0 0 24px;border:2px solid ${BRAND.blue};border-radius:10px;">
        <tr><td style="padding:20px 24px;text-align:center;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:${BRAND.gray500};text-transform:uppercase;letter-spacing:1px;">Tu código exclusivo</p>
          <p style="margin:8px 0;font-size:28px;font-weight:800;color:${BRAND.blue};letter-spacing:3px;">${promoCode}</p>
          <p style="margin:0;font-size:14px;color:${BRAND.gray700};">Un mes de descuento al activar cualquier plan</p>
        </td></tr>
      </table>

      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${BRAND.gray700};">
        Introdúcelo al elegir tu plan. Sin trampa — se aplica al primer mes y luego el precio es el habitual. Sin permanencia.
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
        <tr>
          <td style="border-radius:8px;background:${BRAND.blue};">
            <a href="${pricingUrl}"
              style="display:inline-block;padding:13px 28px;color:${BRAND.white};text-decoration:none;font-weight:600;font-size:15px;border-radius:8px;">
              → Volver con descuento
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:0;font-size:12px;line-height:1.6;color:${BRAND.gray500};font-style:italic;">
        Este es nuestro último email de reactivación. Respetamos tu decisión. Si prefieres no recibir más emails de HolaRevi, usa el enlace de abajo.
      </p>
    </td></tr>
  `;

  return { subject, preheader, html: baseLayout(content) };
}
