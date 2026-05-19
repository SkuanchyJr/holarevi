/**
 * checkoutRecoveryTemplates.ts — HTML templates for the 3-email abandoned-checkout sequence
 *
 * Email 1 (+1h):  Soft reminder — frictionless reactivation
 * Email 2 (+48h): Value reminder — FOMO + benefits reinforcement
 * Email 3 (+7d):  Final recovery — urgency + hard close
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
  green: "#16a34a",
};

function baseLayout(content: string): string {
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

        <!-- Header -->
        <tr>
          <td style="padding:24px 32px 0;text-align:left;">
            <span style="font-size:20px;font-weight:700;color:${BRAND.blue};letter-spacing:-0.5px;">HolaRevi</span>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding:16px 32px 0;">
            <div style="height:1px;background:${BRAND.gray200};"></div>
          </td>
        </tr>

        <!-- Body -->
        ${content}

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px 28px;border-top:1px solid ${BRAND.gray100};font-size:11px;color:${BRAND.gray500};text-align:center;line-height:1.6;">
            HolaRevi · Reseñas con IA<br/>
            <a href="${getAppUrl()}/pricing" style="color:${BRAND.blue};text-decoration:none;">Ver planes</a>
            &nbsp;·&nbsp;
            <a href="${getAppUrl()}/unsubscribe" style="color:${BRAND.gray500};text-decoration:none;">Cancelar suscripción a emails</a>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Email 1: Soft Reminder (+1h) ─────────────────────────────────────────────

export interface RecoveryEmailTemplate {
  subject: string;
  preheader: string;
  html: string;
}

export function buildEmail1(firstName: string | null | undefined): RecoveryEmailTemplate {
  const name = firstName || "hola";
  const appUrl = getAppUrl();
  const ctaUrl = `${appUrl}/pricing`;
  const nfcUrl = `${appUrl}/nfc`;

  const subject = `${firstName ? firstName + ", ¿" : "¿"}dejaste algo a medias? 👀`;
  const preheader = "Tu cuenta está lista. Solo falta un paso.";

  const content = `
    <tr><td style="padding:28px 32px 8px;">
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:${BRAND.gray900};line-height:1.3;">
        ${firstName ? `Hola ${firstName},` : "Hola,"}
      </h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND.gray700};">
        Notamos que empezaste a activar tu cuenta en HolaRevi pero el proceso quedó incompleto.
      </p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${BRAND.gray700};">
        No te preocupes — pasa más seguido de lo que crees.
        Tu progreso está guardado. Solo necesitas <strong>un paso más</strong> para tener todo activo.
      </p>

      <!-- CTA -->
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
        <tr>
          <td style="border-radius:8px;background:${BRAND.blue};">
            <a href="${ctaUrl}"
              style="display:inline-block;padding:13px 28px;color:${BRAND.white};text-decoration:none;font-weight:600;font-size:15px;border-radius:8px;">
              → Completar mi activación
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:${BRAND.gray500};">
        Y cuando tengas todo listo, el <a href="${nfcUrl}" style="color:${BRAND.blue};text-decoration:none;font-weight:600;">Stand NFC de HolaRevi</a> hace que tus clientes dejen reseñas en segundos, solo acercando el móvil al stand — sin buscar en Google, sin apps.
      </p>

      <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.gray500};">
        ¿Tuviste algún problema técnico o tienes dudas sobre el plan? Responde este email
        y te ayudamos ahora mismo.
      </p>
    </td></tr>
  `;

  return { subject, preheader, html: baseLayout(content) };
}

// ─── Email 2: Value Reminder (+48h) ───────────────────────────────────────────

export function buildEmail2(firstName: string | null | undefined): RecoveryEmailTemplate {
  const appUrl = getAppUrl();
  const ctaUrl = `${appUrl}/pricing`;
  const callUrl = `${appUrl}/contact`;
  const nfcUrl = `${appUrl}/nfc`;

  const subject = `Esto es lo que estás perdiendo${firstName ? ", " + firstName : ""} 📊`;
  const preheader = "Mientras no activas, tus reseñas siguen sin gestionarse solas.";

  const content = `
    <tr><td style="padding:28px 32px 8px;">
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:${BRAND.gray900};line-height:1.3;">
        ${firstName ? `Hola ${firstName},` : "Hola,"}
      </h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND.gray700};">
        Hace 2 días empezaste a activar tu cuenta en HolaRevi — y todavía está pendiente.
      </p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${BRAND.gray700};">
        Mientras tanto, tu negocio sigue sin aprovechar esto:
      </p>

      <!-- Benefits list -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="margin:0 0 24px;background:${BRAND.gray100};border-radius:10px;">
        <tr><td style="padding:20px 24px;">
          ${[
            ["✅", "Reseñas automáticas en Google", "sin pedirlas manualmente"],
            ["✅", "Respuestas con IA", "ahorra horas cada semana"],
            ["✅", "Panel de reputación", "controla todo desde un lugar"],
            ["🏷️", "Stand NFC físico", `pon un stand en el mostrador y tus clientes dejan reseñas con solo acercar el móvil — sin buscar en Google`],
          ].map(([icon, title, desc]) => `
            <p style="margin:0 0 12px;font-size:14px;line-height:1.5;color:${BRAND.gray700};">
              <strong>${icon} ${title}</strong> — ${desc}
            </p>
          `).join("")}
          <p style="margin:0;font-size:13px;color:${BRAND.gray500};">
            Negocios como el tuyo ya lo están usando para conseguir más reseñas y convertir más clientes.
          </p>
        </td></tr>
      </table>

      <!-- Primary CTA -->
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
        <tr>
          <td style="border-radius:8px;background:${BRAND.blue};">
            <a href="${ctaUrl}"
              style="display:inline-block;padding:13px 28px;color:${BRAND.white};text-decoration:none;font-weight:600;font-size:15px;border-radius:8px;">
              → Activar mi cuenta ahora
            </a>
          </td>
        </tr>
      </table>

      <!-- Secondary links -->
      <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:${BRAND.gray500};">
        ¿Tienes dudas sobre qué plan es el mejor para ti?
        <a href="${callUrl}" style="color:${BRAND.blue};text-decoration:none;font-weight:600;">
          Habla con nosotros →
        </a>
      </p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.gray500};">
        ¿Te interesa el stand físico?
        <a href="${nfcUrl}" style="color:${BRAND.blue};text-decoration:none;font-weight:600;">
          Ver el Stand NFC →
        </a>
      </p>
    </td></tr>
  `;

  return { subject, preheader, html: baseLayout(content) };
}

// ─── Email 3: Final Recovery (+7d) ────────────────────────────────────────────

export function buildEmail3(
  firstName: string | null | undefined,
  closingDate: Date
): RecoveryEmailTemplate {
  const appUrl = getAppUrl();
  const ctaUrl = `${appUrl}/pricing`;
  const cancelUrl = `${appUrl}/delete-account`;
  const nfcUrl = `${appUrl}/nfc`;

  const dateStr = closingDate.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
  });

  const subject = `${firstName ? firstName + ", ¿" : "¿"}seguimos adelante o cerramos tu cuenta?`;
  const preheader = `Necesitamos tu respuesta antes del ${dateStr}.`;

  const content = `
    <tr><td style="padding:28px 32px 8px;">
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:${BRAND.gray900};line-height:1.3;">
        ${firstName ? `Hola ${firstName},` : "Hola,"}
      </h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND.gray700};">
        Han pasado 7 días desde que empezaste a activar tu cuenta en HolaRevi y todavía
        está pendiente.
      </p>

      <!-- Urgency block -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="margin:0 0 24px;border-left:4px solid ${BRAND.blue};background:${BRAND.gray100};border-radius:0 8px 8px 0;">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0;font-size:14px;line-height:1.6;color:${BRAND.gray700};">
            No queremos eliminarla sin avisarte, así que te lo decimos directamente:<br/><br/>
            <strong>Si no completas la activación antes del ${dateStr}, tu cuenta
            se cerrará automáticamente.</strong>
          </p>
        </td></tr>
      </table>

      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND.gray700};">
        Actívala ahora en menos de 2 minutos y, además de las respuestas automáticas, podrás añadir el <a href="${nfcUrl}" style="color:${BRAND.blue};text-decoration:none;font-weight:600;">Stand NFC</a> — el complemento físico que multiplica las reseñas sin esfuerzo.
      </p>

      <!-- Primary CTA -->
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
        <tr>
          <td style="border-radius:8px;background:${BRAND.blue};">
            <a href="${ctaUrl}"
              style="display:inline-block;padding:13px 28px;color:${BRAND.white};text-decoration:none;font-weight:600;font-size:15px;border-radius:8px;">
              → Sí, quiero activar mi cuenta
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:${BRAND.gray500};">
        <a href="${nfcUrl}" style="color:${BRAND.blue};text-decoration:none;">Ver el Stand NFC →</a>
      </p>

      <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:${BRAND.gray500};">
        ¿Cambió algo o tienes una pregunta antes de decidir? Responde este email y te
        contestamos hoy.
      </p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.gray500};">
        Si ya no te interesa, también puedes
        <a href="${cancelUrl}" style="color:${BRAND.gray500};text-decoration:underline;">
          cerrar tu cuenta aquí
        </a>
        — sin preguntas.
      </p>
    </td></tr>

    <!-- Final note -->
    <tr>
      <td style="padding:0 32px 20px;">
        <p style="margin:16px 0 0;font-size:12px;color:${BRAND.gray500};font-style:italic;">
          Este es nuestro último recordatorio. Respetamos tu tiempo.
        </p>
      </td>
    </tr>
  `;

  return { subject, preheader, html: baseLayout(content) };
}

// ─── Email 0: Welcome (immediate, triggered on email verification) ─────────────

export function buildWelcomeEmail(
  firstName: string | null | undefined,
  language: string | null | undefined
): RecoveryEmailTemplate {
  const lang = language === "en" ? "en" : "es";
  const appUrl = getAppUrl();
  const dashUrl = `${appUrl}/${lang}/dashboard`;
  const nfcUrl = `${appUrl}/nfc`;

  if (lang === "en") {
    const subject = firstName
      ? `${firstName}, your HolaRevi account is ready ✓`
      : "Your HolaRevi account is ready ✓";
    const preheader = "Connect your Google Business and get your first review automatically.";

    const content = `
      <tr><td style="padding:28px 32px 8px;">
        <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:${BRAND.gray900};line-height:1.3;">
          ${firstName ? `Hi ${firstName}!` : "Welcome to HolaRevi!"}
        </h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND.gray700};">
          Your email is confirmed — you're in. HolaRevi manages your Google reviews automatically: it responds to customers, tracks your reputation, and keeps you informed without lifting a finger.
        </p>

        <!-- Steps -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
          style="margin:0 0 24px;background:${BRAND.gray100};border-radius:10px;">
          <tr><td style="padding:20px 24px;">
            <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:${BRAND.gray500};text-transform:uppercase;letter-spacing:1px;">Get started in 3 steps</p>
            ${[
              ["1", "Connect Google Business", "Link the profile where your reviews live."],
              ["2", "Set your brand tone", "Tell HolaRevi how you want to sound with customers."],
              ["3", "Let it run", "HolaRevi replies automatically — or drafts replies for your approval."],
            ].map(([num, title, desc]) => `
              <p style="margin:12px 0 0;font-size:14px;line-height:1.5;color:${BRAND.gray700};">
                <strong style="color:${BRAND.blue};">${num}.</strong> <strong>${title}</strong> — ${desc}
              </p>
            `).join("")}
          </td></tr>
        </table>

        <!-- Primary CTA -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
          <tr>
            <td style="border-radius:8px;background:${BRAND.blue};">
              <a href="${dashUrl}"
                style="display:inline-block;padding:13px 28px;color:${BRAND.white};text-decoration:none;font-weight:600;font-size:15px;border-radius:8px;">
                → Go to my dashboard
              </a>
            </td>
          </tr>
        </table>

        <!-- NFC upsell -->
        <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.gray500};">
          Want even more reviews? The <a href="${nfcUrl}" style="color:${BRAND.blue};text-decoration:none;font-weight:600;">HolaRevi NFC Stand</a> lets customers leave a review in seconds — no app, no typing, just tap and done.
        </p>
      </td></tr>
    `;

    return { subject, preheader, html: baseLayout(content) };
  }

  // ── Spanish (default) ──
  const subject = firstName
    ? `${firstName}, tu cuenta de HolaRevi está lista ✓`
    : "Tu cuenta de HolaRevi está lista ✓";
  const preheader = "Conecta tu Google Business y empieza a recibir reseñas automáticas.";

  const content = `
    <tr><td style="padding:28px 32px 8px;">
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:${BRAND.gray900};line-height:1.3;">
        ${firstName ? `¡Hola ${firstName}!` : "¡Bienvenido/a a HolaRevi!"}
      </h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND.gray700};">
        Tu correo está confirmado — ya eres parte de HolaRevi. A partir de ahora, tu reputación en Google se gestiona sola: respuestas automáticas, seguimiento de valoraciones y alertas cuando más las necesitas.
      </p>

      <!-- Steps -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="margin:0 0 24px;background:${BRAND.gray100};border-radius:10px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:${BRAND.gray500};text-transform:uppercase;letter-spacing:1px;">Empieza en 3 pasos</p>
          ${[
            ["1", "Conecta tu Google Business", "Vincula el perfil donde viven tus reseñas."],
            ["2", "Define tu tono de marca", "Dile a HolaRevi cómo quieres sonar con tus clientes."],
            ["3", "Déjalo funcionar", "HolaRevi responde automáticamente — o prepara borradores para que los revises."],
          ].map(([num, title, desc]) => `
            <p style="margin:12px 0 0;font-size:14px;line-height:1.5;color:${BRAND.gray700};">
              <strong style="color:${BRAND.blue};">${num}.</strong> <strong>${title}</strong> — ${desc}
            </p>
          `).join("")}
        </td></tr>
      </table>

      <!-- Primary CTA -->
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
        <tr>
          <td style="border-radius:8px;background:${BRAND.blue};">
            <a href="${dashUrl}"
              style="display:inline-block;padding:13px 28px;color:${BRAND.white};text-decoration:none;font-weight:600;font-size:15px;border-radius:8px;">
              → Ir a mi panel
            </a>
          </td>
        </tr>
      </table>

      <!-- NFC upsell -->
      <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.gray500};">
        ¿Quieres aún más reseñas? El <a href="${nfcUrl}" style="color:${BRAND.blue};text-decoration:none;font-weight:600;">Stand NFC de HolaRevi</a> permite que tus clientes dejen una reseña en segundos — sin app, sin buscar en Google, solo acercando el móvil.
      </p>
    </td></tr>
  `;

  return { subject, preheader, html: baseLayout(content) };
}
