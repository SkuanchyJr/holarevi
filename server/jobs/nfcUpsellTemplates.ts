/**
 * nfcUpsellTemplates.ts — 2-email sequence for active subscribers without an NFC stand.
 *
 * Email 1 (day 14 of active subscription): "¿Sabías que el Stand NFC multiplica tus reseñas?"
 * Email 2 (day 21, if no purchase after email 1): "25€ que se notan en Google"
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
            <a href="${appUrl}/nfc" style="color:${BRAND.blue};text-decoration:none;">Ver el Stand NFC</a>
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

export interface NfcEmailTemplate {
  subject: string;
  preheader: string;
  html: string;
}

// ─── Email 1 (day 14) ─────────────────────────────────────────────────────────

export function buildNfcEmail1(
  firstName: string | null | undefined
): NfcEmailTemplate {
  const name = firstName || null;
  const appUrl = getAppUrl();
  const nfcUrl = `${appUrl}/nfc`;

  const subject = "¿Cuántas reseñas más podrías tener con un stand físico?";
  const preheader = "Los negocios con Stand NFC reciben hasta 4 veces más reseñas al mes.";

  const content = `
    <tr><td style="padding:28px 32px 8px;">
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:${BRAND.gray900};line-height:1.3;">
        ${name ? `Hola ${name},` : "Hola,"}
      </h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND.gray700};">
        HolaRevi gestiona las reseñas que ya llegan — pero ¿qué pasa con las que no llegan porque tus clientes no saben dónde dejarlas?
      </p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${BRAND.gray700};">
        El <strong>Stand NFC de HolaRevi</strong> resuelve eso. Lo pones en el mostrador, y tus clientes dejan una reseña en Google en 10 segundos — sin buscar, sin teclear, solo acercando el móvil.
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="margin:0 0 24px;background:${BRAND.gray100};border-radius:10px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:${BRAND.gray500};text-transform:uppercase;letter-spacing:1px;">Por qué funciona</p>
          ${[
            ["📱", "Sin apps", "Funciona en cualquier smartphone con NFC. Android e iOS."],
            ["⚡", "10 segundos", "Del mostrador a Google en menos tiempo del que tarda en pagar."],
            ["📍", "Preconfigurado", "Lo enviamos listo para tu Google Business. Sin configuración."],
            ["🔄", "Combinado con HolaRevi", "Cada reseña que llega se responde automáticamente con tu IA."],
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
            <a href="${nfcUrl}"
              style="display:inline-block;padding:13px 28px;color:${BRAND.white};text-decoration:none;font-weight:600;font-size:15px;border-radius:8px;">
              → Ver el Stand NFC
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.gray500};">
        ¿Tienes dudas sobre si funcionará en tu tipo de negocio? Responde este email y te lo explicamos.
      </p>
    </td></tr>
  `;

  return { subject, preheader, html: baseLayout(content) };
}

// ─── Email 2 (day 21) ─────────────────────────────────────────────────────────

export function buildNfcEmail2(
  firstName: string | null | undefined
): NfcEmailTemplate {
  const name = firstName || null;
  const appUrl = getAppUrl();
  const nfcUrl = `${appUrl}/nfc`;

  const subject = "El Stand NFC: 25€ que se notan en Google";
  const preheader = "Envío gratuito a España. Listo para usar desde el primer día.";

  const content = `
    <tr><td style="padding:28px 32px 8px;">
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:${BRAND.gray900};line-height:1.3;">
        ${name ? `Hola ${name},` : "Hola,"}
      </h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND.gray700};">
        La semana pasada te conté sobre el Stand NFC. Hoy quiero ser directo: es 25€ de inversión única que te quita el problema de conseguir reseñas de forma permanente.
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="margin:0 0 20px;border-left:4px solid ${BRAND.blue};background:${BRAND.gray100};border-radius:0 8px 8px 0;">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:${BRAND.gray900};">¿Para quién funciona mejor?</p>
          <p style="margin:0;font-size:14px;line-height:1.6;color:${BRAND.gray700};">
            Restaurantes, bares, peluquerías, clínicas, talleres, tiendas — cualquier negocio donde el cliente está físicamente presente. Si tienes cara a cara con clientes cada día, el stand paga su coste en la primera semana.
          </p>
        </td></tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="margin:0 0 24px;background:${BRAND.gray100};border-radius:10px;">
        <tr><td style="padding:16px 24px;">
          ${[
            ["✅", "25€ precio único (sin suscripción)"],
            ["✅", "Envío gratuito a España Península"],
            ["✅", "Preconfigurado para tu Google Business"],
            ["✅", "Garantía de devolución 30 días"],
          ].map(([icon, text]) => `
            <p style="margin:6px 0;font-size:14px;color:${BRAND.gray700};">${icon} ${text}</p>
          `).join("")}
        </td></tr>
      </table>

      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
        <tr>
          <td style="border-radius:8px;background:${BRAND.blue};">
            <a href="${nfcUrl}"
              style="display:inline-block;padding:13px 28px;color:${BRAND.white};text-decoration:none;font-weight:600;font-size:15px;border-radius:8px;">
              → Pedir mi Stand NFC — 25€
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.gray500};">
        Pagado por Stripe, con devolución garantizada. Si no te convence al verlo, te devolvemos el dinero sin preguntas.
      </p>
    </td></tr>
  `;

  return { subject, preheader, html: baseLayout(content) };
}
