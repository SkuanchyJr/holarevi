/**
 * emailGenerator.ts — Generates weekly analytics email HTML via OpenAI
 *
 * Uses the OpenAI Responses API with a configurable model.
 * Includes retry logic, zero-activity fallback, and HTML post-processing.
 *
 * Required env vars:
 *   - OPENAI_API_KEY
 *   - OPENAI_MODEL (optional, defaults to "gpt-4o")
 */

import OpenAI from "openai";
import type { WeeklyMetrics } from "./emailMetrics";

// ─── Config ──────────────────────────────────────────────────────────────────

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

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

// ─── System prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres el sistema de comunicación de HolaRevi. Generas emails semanales de analytics para negocios locales. Devuelves ÚNICAMENTE un JSON válido con las claves 'subject' y 'html'. El valor 'html' debe ser un email completo en HTML listo para enviar con Nodemailer. No incluyas markdown, comentarios ni texto fuera del JSON.`;

// ─── User prompt builder ─────────────────────────────────────────────────────

function buildUserPrompt(metrics: WeeklyMetrics): string {
  const businessName = metrics.businessNames.join(", ");
  const contactName = metrics.userName;
  const businessType = "negocio local"; // generic since schema doesn't have type
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
  Si estas métricas no están disponibles, no las muestres. En su lugar, puedes sugerir brevemente que activar solicitudes de reseña puede mejorar resultados.`;
  }

  return `Eres el sistema de comunicación inteligente de HolaRevi. Redacta un email semanal de analytics del viernes para este cliente.

Debes devolver exclusivamente un JSON válido con esta estructura exacta:
{
  "subject": "asunto del email",
  "html": "email completo en HTML"
}

No devuelvas texto fuera del JSON.
No devuelvas markdown.
No devuelvas explicaciones.

Datos del cliente:
- Negocio: ${businessName}
- Contacto: ${contactName}
- Tipo de negocio: ${businessType}
- Plan: ${planName}
- Semana: ${weekStart} al ${weekEnd}
- Semanas activo con HolaRevi: ${weeksActive}

Métricas de esta semana:
- Reseñas nuevas recibidas: ${reviewsReceived}
- Reseñas respondidas automáticamente: ${autoResponded}
- Tiempo medio de respuesta: ${avgResponseTime}
- Valoración media actual: ${currentRating}/5
- Cambio vs semana anterior: ${ratingChange}
- Reseñas negativas gestionadas: ${negativeHandled}
${requestMetricsSection}
- Mejor reseña de la semana: "${bestReview}"
- Total de reseñas gestionadas por HolaRevi: ${totalManaged}

Instrucciones de redacción:
- Tono cercano, directo, español. No corporativo, no genérico.
- El negocio es el protagonista, HolaRevi trabaja en segundo plano para ellos.
- Debe parecer un email real, útil y agradable de leer.
- Legible en menos de 90 segundos.
- Si una métrica es 0, transfórmala en contexto o acción útil.
- El asunto debe ser específico y mencionar el dato más llamativo de la semana.

Estructura obligatoria dentro del HTML:
1. Saludo con el nombre del contacto
2. Titular de la semana
3. Resumen breve del impacto
4. Métricas clave con buena jerarquía visual
5. Mejor reseña de la semana entre comillas con una frase de contexto emocional
6. Un insight inteligente
7. Una sola llamada a acción con el placeholder [ENLACE AL DASHBOARD]
8. Cierre humano firmado como "El equipo de HolaRevi"

Requisitos técnicos del HTML:
- HTML listo para enviar por email
- Visualmente limpio y profesional
- Compatible con clientes de correo
- Sin JavaScript
- Sin markdown
- Sin comentarios
- Todo el contenido debe ir dentro del valor \`html\``;
}

// ─── HTML validation & fallback ──────────────────────────────────────────────

function validateAndFixHtml(html: string): string {
  // Check if it looks like a valid HTML email
  const hasHtmlTag = /<html/i.test(html);
  const hasBodyTag = /<body/i.test(html);

  if (hasHtmlTag || hasBodyTag) {
    return html;
  }

  // Wrap bare content in a proper email HTML structure
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HolaRevi — Resumen Semanal</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f9fc;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f9fc;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
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
}

// ─── Zero-activity fallback template ─────────────────────────────────────────

export function generateFallbackEmail(metrics: WeeklyMetrics): GeneratedEmail {
  const contactName = metrics.userName;
  const businessName = metrics.businessNames.join(", ");
  const weekStart = metrics.weekStart;
  const weekEnd = metrics.weekEnd;

  const subject = `${businessName} — Tu resumen semanal del ${weekStart} al ${weekEnd}`;
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HolaRevi — Resumen Semanal</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f9fc;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f9fc;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px 40px; text-align: center;">
              <h1 style="color:#ffffff;font-size:24px;margin:0;">HolaRevi</h1>
              <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:8px 0 0 0;">Resumen semanal</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <p style="font-size:16px;color:#1a1a2e;margin:0 0 16px 0;">Hola ${contactName},</p>
              <p style="font-size:15px;color:#4a4a68;line-height:1.6;margin:0 0 16px 0;">
                Esta semana (${weekStart} al ${weekEnd}) no hemos registrado actividad nueva en reseñas para <strong>${businessName}</strong>.
              </p>
              <p style="font-size:15px;color:#4a4a68;line-height:1.6;margin:0 0 16px 0;">
                Esto puede pasar en semanas tranquilas. Aquí van algunas ideas para mantener el impulso:
              </p>
              <ul style="font-size:14px;color:#4a4a68;line-height:1.8;padding-left:20px;margin:0 0 24px 0;">
                <li>Recuerda a tus clientes que dejen una reseña después de su visita</li>
                <li>Comparte tu QR de reseñas en un lugar visible del negocio</li>
                <li>Responde a reseñas anteriores que estén pendientes</li>
              </ul>
              <p style="font-size:15px;color:#4a4a68;line-height:1.6;margin:0 0 24px 0;">
                Tu valoración media actual es <strong>${metrics.currentRating}/5</strong> con <strong>${metrics.totalManaged}</strong> reseñas gestionadas en total. ¡Sigue así!
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px 0;">
                    <a href="[ENLACE AL DASHBOARD]" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">Ver tu dashboard</a>
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
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
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
        max_output_tokens: 1500,
      });

      // Extract text from response
      const rawContent =
        response.output_text || "";

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

      // Post-process HTML: validate and fix if necessary
      const validatedHtml = validateAndFixHtml(parsed.html);

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
