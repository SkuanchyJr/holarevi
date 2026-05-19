/**
 * activationEmailTemplates.ts — 3-email sequence for users who registered
 * but haven't connected a Google Business profile yet.
 *
 * Email 1 (+48h):  "Tu siguiente paso en HolaRevi (2 minutos)"
 * Email 2 (+5d):   "¿Tuviste algún problema para conectar?"
 * Email 3 (+10d):  "Tu panel HolaRevi sigue esperando"
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

export interface ActivationEmailTemplate {
  subject: string;
  preheader: string;
  html: string;
}

// ─── Email 1 (+48h) ───────────────────────────────────────────────────────────

export function buildActivationEmail1(
  firstName: string | null | undefined
): ActivationEmailTemplate {
  const name = firstName || null;
  const appUrl = getAppUrl();
  const dashUrl = `${appUrl}/es/dashboard`;
  const nfcUrl = `${appUrl}/nfc`;

  const subject = name
    ? `${name}, falta un paso para que HolaRevi trabaje por ti`
    : "Falta un paso para que HolaRevi trabaje por ti";
  const preheader = "Conecta tu Google Business en 2 minutos y empieza a recibir reseñas automáticas.";

  const content = `
    <tr><td style="padding:28px 32px 8px;">
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:${BRAND.gray900};line-height:1.3;">
        ${name ? `Hola ${name},` : "Hola,"}
      </h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND.gray700};">
        Tu cuenta está lista. Pero para que HolaRevi pueda responder reseñas en tu nombre, necesita saber <strong>dónde viven esas reseñas</strong>: tu perfil de Google Business.
      </p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${BRAND.gray700};">
        Solo tienes que conectarlo una vez. A partir de ahí, HolaRevi funciona solo.
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="margin:0 0 24px;background:${BRAND.gray100};border-radius:10px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:${BRAND.gray500};text-transform:uppercase;letter-spacing:1px;">En 3 pasos</p>
          ${[
            ["1", "Entra a tu panel"],
            ["2", "Haz clic en &ldquo;Añadir negocio&rdquo;"],
            ["3", "Conecta tu Google Business con un clic"],
          ].map(([num, text]) => `
            <p style="margin:10px 0 0;font-size:14px;line-height:1.5;color:${BRAND.gray700};">
              <strong style="color:${BRAND.blue};">${num}.</strong> ${text}
            </p>
          `).join("")}
        </td></tr>
      </table>

      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
        <tr>
          <td style="border-radius:8px;background:${BRAND.blue};">
            <a href="${dashUrl}"
              style="display:inline-block;padding:13px 28px;color:${BRAND.white};text-decoration:none;font-weight:600;font-size:15px;border-radius:8px;">
              → Conectar mi Google Business
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:${BRAND.gray500};">
        ¿Quieres más reseñas desde el primer día? El <a href="${nfcUrl}" style="color:${BRAND.blue};text-decoration:none;font-weight:600;">Stand NFC de HolaRevi</a> permite que tus clientes dejen una reseña en segundos — sin app, sin buscar, solo acercando el móvil.
      </p>

      <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.gray500};">
        ¿Tienes alguna duda? Responde este email y te ayudamos.
      </p>
    </td></tr>
  `;

  return { subject, preheader, html: baseLayout(content) };
}

// ─── Email 2 (+5d) ────────────────────────────────────────────────────────────

export function buildActivationEmail2(
  firstName: string | null | undefined
): ActivationEmailTemplate {
  const name = firstName || null;
  const appUrl = getAppUrl();
  const dashUrl = `${appUrl}/es/dashboard`;
  const contactUrl = `${appUrl}/contact`;

  const subject = name
    ? `${name}, ¿tuviste algún problema para conectar?`
    : "¿Tuviste algún problema para conectar?";
  const preheader = "Si algo no funcionó, te ayudamos en 5 minutos.";

  const content = `
    <tr><td style="padding:28px 32px 8px;">
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:${BRAND.gray900};line-height:1.3;">
        ${name ? `Hola ${name},` : "Hola,"}
      </h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND.gray700};">
        Hace unos días te registraste en HolaRevi, pero tu Google Business todavía no está conectado.
      </p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND.gray700};">
        Quiero asegurarme de que todo va bien. Si algo no funcionó al conectar — un error de permisos, un perfil de Google Business que no aparecía, lo que sea — cuéntanos y lo resolvemos hoy mismo.
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="margin:0 0 24px;border-left:4px solid ${BRAND.blue};background:${BRAND.gray100};border-radius:0 8px 8px 0;">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0;font-size:14px;line-height:1.6;color:${BRAND.gray700};">
            Los negocios que conectan Google Business en la primera semana reciben de media <strong>3 veces más reseñas</strong> el primer mes que los que esperan.
          </p>
        </td></tr>
      </table>

      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
        <tr>
          <td style="border-radius:8px;background:${BRAND.blue};">
            <a href="${dashUrl}"
              style="display:inline-block;padding:13px 28px;color:${BRAND.white};text-decoration:none;font-weight:600;font-size:15px;border-radius:8px;">
              → Conectar ahora
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.gray500};">
        ¿Prefieres que te ayudemos directamente?
        <a href="${contactUrl}" style="color:${BRAND.blue};text-decoration:none;font-weight:600;">Escríbenos →</a>
      </p>
    </td></tr>
  `;

  return { subject, preheader, html: baseLayout(content) };
}

// ─── Email 3 (+10d) ───────────────────────────────────────────────────────────

export function buildActivationEmail3(
  firstName: string | null | undefined
): ActivationEmailTemplate {
  const name = firstName || null;
  const appUrl = getAppUrl();
  const dashUrl = `${appUrl}/es/dashboard`;
  const nfcUrl = `${appUrl}/nfc`;

  const subject = name
    ? `${name}, tu panel HolaRevi lleva 10 días esperando`
    : "Tu panel HolaRevi lleva varios días esperando";
  const preheader = "Mientras tanto, tus competidores ya están respondiendo reseñas con IA.";

  const content = `
    <tr><td style="padding:28px 32px 8px;">
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:${BRAND.gray900};line-height:1.3;">
        ${name ? `Hola ${name},` : "Hola,"}
      </h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND.gray700};">
        Tu cuenta está lista desde hace más de una semana, pero Google Business todavía no está conectado. HolaRevi no puede trabajar sin esa conexión.
      </p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${BRAND.gray700};">
        Mientras tanto, cada reseña que llega a tu perfil queda sin responder. Y el 53% de los clientes no visita un negocio que no responde reseñas.
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
        <tr>
          <td style="border-radius:8px;background:${BRAND.blue};">
            <a href="${dashUrl}"
              style="display:inline-block;padding:13px 28px;color:${BRAND.white};text-decoration:none;font-weight:600;font-size:15px;border-radius:8px;">
              → Conectar mi Google Business ahora
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:${BRAND.gray500};">
        Y si quieres que tus clientes dejen más reseñas desde el primer día, el <a href="${nfcUrl}" style="color:${BRAND.blue};text-decoration:none;font-weight:600;">Stand NFC de HolaRevi</a> es el complemento físico que multiplica el volumen sin esfuerzo.
      </p>

      <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.gray500};">
        ¿Necesitas ayuda o tienes dudas sobre si HolaRevi es para ti? Responde este email. Es el último recordatorio que te enviaremos sobre esto.
      </p>
    </td></tr>
  `;

  return { subject, preheader, html: baseLayout(content) };
}
