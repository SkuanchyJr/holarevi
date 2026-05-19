/**
 * emailGenerator.ts — Generates weekly analytics email HTML via OpenAI
 *
 * Uses the OpenAI Responses API with a configurable model.
 * Includes retry logic, zero-activity fallback, and HTML post-processing.
 *
 * Required env vars:
 *   - OPENAI_API_KEY
 *   - OPENAI_MODEL (optional, defaults to "gpt-4o")
 *   - APP_URL (optional, defaults to "https://holarevi.com")
 */

import OpenAI from "openai";
import type { WeeklyMetrics } from "./emailMetrics";

// ─── Config ──────────────────────────────────────────────────────────────────

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o";
const APP_URL = process.env.APP_URL || "https://holarevi.com";

// Brand colors (aligned with HolaRevi logo)
const BRAND = {
  primary: "#2563EB",      // Azul HolaRevi
  primaryDark: "#1D4ED8",
  primaryLight: "#3B82F6",
  accent: "#38BDF8",       // Celeste sonrisa del logo
  ink: "#0F172A",          // Texto principal
  inkSoft: "#334155",      // Texto secundario
  muted: "#64748B",        // Texto terciario
  line: "#E2E8F0",         // Bordes
  bg: "#F1F5F9",           // Fondo exterior
  card: "#FFFFFF",         // Fondo tarjeta
  success: "#10B981",
  successBg: "#ECFDF5",
  warn: "#F59E0B",
  warnBg: "#FFFBEB",
  danger: "#EF4444",
  dangerBg: "#FEF2F2",
};

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is required for weekly email generation");
    }
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GeneratedEmail {
  subject: string;
  html: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Replaces [ENLACE AL DASHBOARD] placeholder with the real APP_URL. */
function replaceDashboardPlaceholder(html: string): string {
  return html
    .replace(/\[ENLACE AL DASHBOARD\]/g, `${APP_URL}/es/dashboard`)
    .replace(/\[ENLACE_AL_DASHBOARD\]/g, `${APP_URL}/es/dashboard`);
}

/** Builds the unsubscribe / preferences footer used in every email. */
function buildFooter(userEmail: string): string {
  const safeEmail = escapeHtml(userEmail);
  return `
    <tr>
      <td style="padding:24px 40px 8px 40px;border-top:1px solid ${BRAND.line};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${BRAND.muted};line-height:1.6;">
              <p style="margin:0 0 8px 0;">
                Recibes este email porque tienes una cuenta activa en HolaRevi asociada a <strong style="color:${BRAND.inkSoft};">${safeEmail}</strong>.
              </p>
              <p style="margin:0 0 8px 0;">
                <a href="${APP_URL}/es/settings/notifications" style="color:${BRAND.primary};text-decoration:none;">Gestionar notificaciones</a>
                &nbsp;·&nbsp;
                <a href="${APP_URL}/es/dashboard" style="color:${BRAND.primary};text-decoration:none;">Ir al dashboard</a>
                &nbsp;·&nbsp;
                <a href="${APP_URL}/es/support" style="color:${BRAND.primary};text-decoration:none;">Soporte</a>
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

/** Builds the branded header with logo mark. */
function buildHeader(subtitle: string): string {
  return `
    <tr>
      <td style="background:${BRAND.primary};background:linear-gradient(135deg, ${BRAND.primaryDark} 0%, ${BRAND.primary} 60%, ${BRAND.accent} 130%);padding:28px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align:middle;">
              <span style="font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">holarevi</span>
            </td>
            <td align="right" style="vertical-align:middle;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:1px;">
              ${escapeHtml(subtitle)}
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

// ─── Promotional blocks (injected conditionally) ─────────────────────────────

function buildTrialConversionBlock(): string {
  return `
    <tr>
      <td style="padding:8px 40px 0 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
          style="background-color:#FFFBEB;border-radius:10px;border:1px solid #FDE68A;">
          <tr><td style="padding:20px 24px;">
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#D97706;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:1px;">⚡ Periodo de prueba activo</p>
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#374151;line-height:1.6;margin:0 0 12px 0;">
              Todavía estás en modo prueba. Activa tu plan para mantener las respuestas automáticas, el panel de reputación y las alertas funcionando sin interrupciones.
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-radius:8px;background:${BRAND.primary};">
                  <a href="${APP_URL}/pricing" style="display:inline-block;padding:10px 20px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                    Activar mi plan →
                  </a>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </td>
    </tr>`;
}

function buildNfcPromoBlock(): string {
  return `
    <tr>
      <td style="padding:8px 40px 0 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
          style="background-color:#F8FAFC;border-radius:10px;border:1px solid ${BRAND.line};">
          <tr><td style="padding:16px 20px;">
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${BRAND.ink};margin:0 0 4px 0;font-weight:600;">
              🏷️ ¿Conoces el Stand NFC de HolaRevi?
            </p>
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${BRAND.inkSoft};line-height:1.6;margin:0 0 8px 0;">
              Ponlo en el mostrador y tus clientes dejan reseñas en segundos — sin apps, sin buscar en Google, solo acercando el móvil.
            </p>
            <a href="${APP_URL}/nfc" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${BRAND.primary};text-decoration:none;font-weight:600;">
              Ver el Stand NFC →
            </a>
          </td></tr>
        </table>
      </td>
    </tr>`;
}

/**
 * Injects promotional blocks (trial conversion + NFC) before the footer row.
 * The footer always contains "Gestionar notificaciones" — we walk backwards
 * from that marker to find the opening <tr> of the footer row.
 */
function injectPromotionalBlocks(html: string, metrics: WeeklyMetrics): string {
  const blocks: string[] = [];
  if (!metrics.hasActiveSubscription) blocks.push(buildTrialConversionBlock());
  if (!metrics.hasNfcOrder) blocks.push(buildNfcPromoBlock());
  if (blocks.length === 0) return html;

  const blocksHtml = blocks.join("");
  const marker = "Gestionar notificaciones";
  const markerIdx = html.indexOf(marker);

  if (markerIdx === -1) {
    // Fallback: inject before </body>
    return html.replace("</body>", `${blocksHtml}</body>`);
  }

  const trIdx = html.lastIndexOf("<tr", markerIdx);
  if (trIdx === -1) {
    return html.replace("</body>", `${blocksHtml}</body>`);
  }

  return html.slice(0, trIdx) + blocksHtml + html.slice(trIdx);
}

// ─── System prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres el sistema de comunicación de HolaRevi, un SaaS de gestión de reseñas de Google para negocios locales. Generas emails semanales de analytics. Devuelves ÚNICAMENTE un JSON válido con las claves 'subject' y 'html'. El valor 'html' debe ser un email completo en HTML listo para enviar con Nodemailer, compatible con Gmail, Outlook, Apple Mail y clientes móviles. No incluyas markdown, comentarios, ni texto fuera del JSON.`;

// ─── User prompt builder ─────────────────────────────────────────────────────

function buildUserPrompt(metrics: WeeklyMetrics): string {
  const businessName = metrics.businessNames.join(", ");
  const contactName = metrics.userName;
  const planName = metrics.planName || "Gratuito";
  const weekStart = metrics.weekStart;
  const weekEnd = metrics.weekEnd;
  const weeksActive = metrics.weeksActive;

  const reviewsReceived = metrics.reviewsReceived;
  const autoResponded = metrics.autoResponded;
  const avgResponseTime = metrics.avgResponseTime;
  const currentRating = metrics.currentRating;
  const ratingChange = metrics.ratingChange;
  const negativeHandled = metrics.negativeHandled;
  const totalManaged = metrics.totalManaged;
  const bestReview = metrics.bestReview;

  // Build request metrics section
  let requestMetricsSection: string;
  if (metrics.requestsSent !== null && metrics.conversionRate !== null) {
    requestMetricsSection = `- Solicitudes de reseña enviadas: ${metrics.requestsSent}
- Tasa de conversión de solicitudes: ${metrics.conversionRate}%`;
  } else {
    requestMetricsSection = `- Solicitudes de reseña enviadas: No disponible (función no activada)
- Tasa de conversión de solicitudes: No disponible
  Si estas métricas no están disponibles, no las muestres como KPI. En su lugar, sugiere brevemente en el bloque de insight que activar solicitudes con QR puede multiplicar el volumen de reseñas.`;
  }

  return `Eres el sistema de comunicación inteligente de HolaRevi. Redacta un email semanal de analytics del viernes para este cliente.

Debes devolver exclusivamente un JSON válido con esta estructura exacta:
{
  "subject": "asunto del email",
  "html": "email completo en HTML"
}

No devuelvas texto fuera del JSON. No devuelvas markdown. No devuelvas explicaciones.

═══════════════════════════════════════
DATOS DEL CLIENTE
═══════════════════════════════════════
- Negocio: ${businessName}
- Contacto: ${contactName}
- Plan: ${planName}
- Semana: ${weekStart} al ${weekEnd}
- Semanas activo con HolaRevi: ${weeksActive}

═══════════════════════════════════════
MÉTRICAS DE ESTA SEMANA
═══════════════════════════════════════
- Reseñas nuevas recibidas: ${reviewsReceived}
- Reseñas respondidas automáticamente: ${autoResponded}
- Tiempo medio de respuesta: ${avgResponseTime}
- Valoración media actual: ${currentRating}/5
- Cambio vs semana anterior: ${ratingChange}
- Reseñas negativas gestionadas: ${negativeHandled}
${requestMetricsSection}
- Mejor reseña de la semana: "${bestReview}"
- Total de reseñas gestionadas por HolaRevi: ${totalManaged}

═══════════════════════════════════════
INSTRUCCIONES DE REDACCIÓN
═══════════════════════════════════════
- Tono: cercano, directo, profesional. Español de España. NO corporativo, NO genérico, NO cursi.
- El negocio es el protagonista. HolaRevi trabaja en segundo plano.
- Debe parecer un email real escrito por una persona que conoce el negocio.
- Legible en menos de 90 segundos.
- Si una métrica es 0, transfórmala en contexto útil (no la escondas, pero no la dramatices).
- El asunto debe ser específico, mencionar el negocio y el dato más llamativo. Menos de 70 caracteres. NADA de emojis en el asunto salvo que aporten claridad real.
- Usa datos concretos siempre que puedas. Evita "¡increíble!", "¡genial!", "¡fantástico!".

═══════════════════════════════════════
ESTRUCTURA OBLIGATORIA DEL EMAIL (HTML)
═══════════════════════════════════════
1. **Preheader oculto** (máx 90 caracteres) con resumen de la semana — lo lee el inbox antes de abrir.
2. **Header con marca HolaRevi** — usa el bloque exacto que se incluye más abajo.
3. **Saludo personal** — "Hola ${contactName},"
4. **Titular de la semana** — una frase de 8-14 palabras que resuma el dato más relevante.
5. **Resumen breve** (1-2 frases) del impacto de la semana en lenguaje de negocio.
6. **Grid de KPIs (4 tarjetas)** en tabla 2x2 con:
   - Reseñas recibidas
   - Tasa de respuesta (autoResponded / reviewsReceived × 100, o el total)
   - Valoración media + flecha de cambio
   - Tiempo medio de respuesta
   Cada tarjeta: número grande, label pequeño en mayúsculas, tipografía clara.
7. **Bloque "Mejor reseña de la semana"** — cita destacada con borde lateral celeste, nombre entrecomillado y frase corta de contexto.
8. **Bloque "Insight de la semana"** — un solo insight accionable y específico (no genérico). Si hay reseñas negativas gestionadas, menciónalas con criterio (no alarmismo). Si la tasa de respuesta bajó, sugiere revisar reglas. Si subió el rating, celébralo de forma medida.
9. **CTA único** con botón azul primario usando el placeholder [ENLACE AL DASHBOARD] con el texto "Ver mi dashboard".
10. **Cierre humano** firmado como "El equipo de HolaRevi".

═══════════════════════════════════════
PALETA DE COLORES (OBLIGATORIA)
═══════════════════════════════════════
- Primario:       ${BRAND.primary}
- Primario oscuro:${BRAND.primaryDark}
- Acento celeste: ${BRAND.accent}
- Texto ppal:     ${BRAND.ink}
- Texto medio:    ${BRAND.inkSoft}
- Texto suave:    ${BRAND.muted}
- Línea/borde:    ${BRAND.line}
- Fondo exterior: ${BRAND.bg}
- Tarjeta:        ${BRAND.card}
- Éxito:          ${BRAND.success} (fondo ${BRAND.successBg})
- Alerta:         ${BRAND.warn} (fondo ${BRAND.warnBg})
- Negativo:       ${BRAND.danger} (fondo ${BRAND.dangerBg})

NO uses morados, rosas ni degradados fuera de esta paleta.

═══════════════════════════════════════
REQUISITOS TÉCNICOS DEL HTML
═══════════════════════════════════════
- DOCTYPE html + lang="es" + charset UTF-8 + viewport responsive.
- Ancho máximo del cuerpo: 600px, centrado, con fondo exterior ${BRAND.bg}.
- Todo en tablas anidadas <table role="presentation"> con cellpadding="0" cellspacing="0".
- Estilos INLINE exclusivamente. Nada de <style> en <head> excepto el preheader hidden y una media query opcional.
- Tipografía: Arial, Helvetica, sans-serif en todo.
- Botones: <a> con display:inline-block, padding sólido, border-radius:8px, color de fondo ${BRAND.primary}, color de texto #ffffff. NADA de <button>.
- Incluye un <div> preheader oculto justo al abrir <body>.
- NO uses JavaScript. NO uses imágenes externas salvo las del CDN de HolaRevi si es necesario. Prefiere texto + colores sólidos.
- Compatible con modo oscuro: añade meta tag y usa colores con suficiente contraste.
- El HTML debe ser autosuficiente (no depender de CSS externo).
- Todo el contenido debe ir dentro del valor \`html\`.`;
}

// ─── HTML validation & fallback ──────────────────────────────────────────────

function validateAndFixHtml(html: string): string {
  // Check if it looks like a valid HTML email
  const hasHtmlTag = /<html/i.test(html);
  const hasBodyTag = /<body/i.test(html);

  if (hasHtmlTag || hasBodyTag) {
    return replaceDashboardPlaceholder(html);
  }

  // Wrap bare content in a proper email HTML structure
  const wrapped = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>HolaRevi — Resumen semanal</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bg};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:${BRAND.card};border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">
          <tr>
            <td style="padding:32px 40px;">
              ${html}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  return replaceDashboardPlaceholder(wrapped);
}

// ─── Zero-activity fallback template ─────────────────────────────────────────

export function generateFallbackEmail(metrics: WeeklyMetrics): GeneratedEmail {
  const contactName = escapeHtml(metrics.userName);
  const businessName = escapeHtml(metrics.businessNames.join(", "));
  const userEmail = metrics.userEmail;
  const weekStart = escapeHtml(metrics.weekStart);
  const weekEnd = escapeHtml(metrics.weekEnd);
  const rating = escapeHtml(metrics.currentRating);
  const total = metrics.totalManaged;

  const subject = `Resumen semanal de ${metrics.businessNames.join(", ")} — semana tranquila, cómo aprovecharla`;
  const preheader = `Del ${metrics.weekStart} al ${metrics.weekEnd} · ${rating}★ · ${total} reseñas gestionadas en total`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>HolaRevi — Resumen semanal</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:Arial,Helvetica,sans-serif;">
  <!-- Preheader (hidden preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${BRAND.bg};opacity:0;">
    ${escapeHtml(preheader)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bg};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:${BRAND.card};border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">

          ${buildHeader("Resumen semanal")}

          <!-- Intro -->
          <tr>
            <td style="padding:32px 40px 8px 40px;">
              <p style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:${BRAND.ink};margin:0 0 4px 0;">Hola ${contactName},</p>
              <h2 style="font-family:Arial,Helvetica,sans-serif;font-size:22px;color:${BRAND.ink};line-height:1.3;margin:16px 0 12px 0;font-weight:700;">
                Semana tranquila en <span style="color:${BRAND.primary};">${businessName}</span>
              </h2>
              <p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;margin:0 0 8px 0;">
                Del <strong>${weekStart}</strong> al <strong>${weekEnd}</strong> no ha entrado ninguna reseña nueva en Google. No es malo: pasa en semanas flojas, festivos o entre temporadas. Aquí te dejo cómo aprovechar esta semana para llegar a la siguiente con más tracción.
              </p>
            </td>
          </tr>

          <!-- KPI snapshot -->
          <tr>
            <td style="padding:8px 40px 16px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;border:1px solid ${BRAND.line};border-radius:10px;">
                <tr>
                  <td style="padding:20px 24px;" align="center">
                    <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${BRAND.muted};margin:0 0 4px 0;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Estado actual de tu reputación</p>
                    <p style="font-family:Arial,Helvetica,sans-serif;font-size:32px;color:${BRAND.ink};margin:4px 0;font-weight:800;letter-spacing:-1px;">${rating} <span style="color:${BRAND.warn};font-size:24px;">★</span></p>
                    <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${BRAND.muted};margin:0;">${total} reseñas gestionadas en total por HolaRevi</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 3 tips accionables -->
          <tr>
            <td style="padding:8px 40px 16px 40px;">
              <h3 style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:${BRAND.ink};margin:16px 0 12px 0;font-weight:700;">
                3 cosas que puedes hacer esta semana
              </h3>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid ${BRAND.line};">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="32" style="vertical-align:top;">
                          <div style="width:28px;height:28px;border-radius:50%;background-color:${BRAND.primary};color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;text-align:center;line-height:28px;">1</div>
                        </td>
                        <td style="vertical-align:top;padding-left:12px;">
                          <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${BRAND.ink};margin:0 0 4px 0;font-weight:600;">Activa tu QR de reseñas</p>
                          <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${BRAND.inkSoft};margin:0;line-height:1.5;">Ponlo en la mesa, en recepción o en el ticket. Los negocios que lo usan reciben entre 3x y 5x más reseñas al mes.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid ${BRAND.line};">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="32" style="vertical-align:top;">
                          <div style="width:28px;height:28px;border-radius:50%;background-color:${BRAND.primary};color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;text-align:center;line-height:28px;">2</div>
                        </td>
                        <td style="vertical-align:top;padding-left:12px;">
                          <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${BRAND.ink};margin:0 0 4px 0;font-weight:600;">Revisa reseñas antiguas sin responder</p>
                          <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${BRAND.inkSoft};margin:0;line-height:1.5;">El 42% de consumidores descarta un negocio que no responde nunca. Contestar una reseña de hace 6 meses sigue sumando confianza pública.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="32" style="vertical-align:top;">
                          <div style="width:28px;height:28px;border-radius:50%;background-color:${BRAND.primary};color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;text-align:center;line-height:28px;">3</div>
                        </td>
                        <td style="vertical-align:top;padding-left:12px;">
                          <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${BRAND.ink};margin:0 0 4px 0;font-weight:600;">Afina el tono de marca</p>
                          <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${BRAND.inkSoft};margin:0;line-height:1.5;">Entra al dashboard y revisa cómo responde HolaRevi en tu nombre. Un pequeño ajuste en el tono puede marcar la diferencia frente a respuestas genéricas.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding:16px 40px 32px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:${BRAND.primary};border-radius:8px;">
                    <a href="${APP_URL}/es/dashboard" style="display:inline-block;padding:14px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">Ver mi dashboard</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Signature -->
          <tr>
            <td style="padding:0 40px 24px 40px;">
              <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${BRAND.inkSoft};margin:0;line-height:1.6;">
                Un abrazo,<br>
                <strong style="color:${BRAND.ink};">El equipo de HolaRevi</strong>
              </p>
            </td>
          </tr>

          ${buildFooter(userEmail)}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const finalHtml = injectPromotionalBlocks(replaceDashboardPlaceholder(html), metrics);
  return { subject, html: finalHtml };
}

// ─── Main generation function ────────────────────────────────────────────────

/**
 * Generate a weekly analytics email using OpenAI.
 * Returns null if generation fails after retry.
 */
export async function generateWeeklyEmail(
  metrics: WeeklyMetrics
): Promise<GeneratedEmail | null> {
  // Zero-activity guard: skip OpenAI call
  if (!metrics.hasActivity) {
    console.log(`[WeeklyEmail] No activity for ${metrics.userName}, using fallback template`);
    return generateFallbackEmail(metrics);
  }

  const userPrompt = buildUserPrompt(metrics);
  const maxRetries = 2; // 1 initial + 1 retry

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `[WeeklyEmail] Generating email for ${metrics.userName} (attempt ${attempt}/${maxRetries}, model: ${OPENAI_MODEL})`
      );

      const openai = getOpenAI();

      const response = await openai.responses.create({
        model: OPENAI_MODEL,
        input: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        text: {
          format: { type: "json_object" },
        },
        temperature: 0.7,
        max_output_tokens: 2500,
      });

      // Extract text from response
      const rawContent = response.output_text || "";

      if (!rawContent) {
        console.error(`[WeeklyEmail] Empty response from OpenAI (attempt ${attempt})`);
        if (attempt < maxRetries) continue;
        return null;
      }

      // Parse JSON
      let parsed: { subject?: string; html?: string };
      try {
        parsed = JSON.parse(rawContent);
      } catch (parseError) {
        console.error(
          `[WeeklyEmail] Failed to parse OpenAI response as JSON (attempt ${attempt}):`,
          rawContent.substring(0, 200)
        );
        if (attempt < maxRetries) continue;
        return null;
      }

      if (!parsed.subject || !parsed.html) {
        console.error(
          `[WeeklyEmail] Missing subject or html in response (attempt ${attempt})`
        );
        if (attempt < maxRetries) continue;
        return null;
      }

      // Post-process HTML: validate and fix if necessary + replace placeholders
      let validatedHtml = validateAndFixHtml(parsed.html);

      // Inject footer if not present (safety net)
      if (!/Gestionar notificaciones/i.test(validatedHtml) && metrics.userEmail) {
        validatedHtml = validatedHtml.replace(
          /<\/table>\s*<\/td>\s*<\/tr>\s*<\/table>\s*<\/body>/i,
          (match) => {
            // Insert footer before the last </table></td></tr></table></body>
            return match.replace(
              /<\/table>\s*<\/body>/i,
              `${buildFooter(metrics.userEmail)}</table></td></tr></table></body>`
            );
          }
        );
      }

      // Inject trial conversion + NFC promo blocks before footer
      validatedHtml = injectPromotionalBlocks(validatedHtml, metrics);

      console.log(`[WeeklyEmail] Successfully generated email for ${metrics.userName}`);

      return {
        subject: parsed.subject,
        html: validatedHtml,
      };
    } catch (error: any) {
      console.error(
        `[WeeklyEmail] OpenAI error (attempt ${attempt}/${maxRetries}):`,
        error?.message || error
      );
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
      return null;
    }
  }

  return null;
}