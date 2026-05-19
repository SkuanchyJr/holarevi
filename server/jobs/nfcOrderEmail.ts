import { getTransporter } from "./emailSender";
import type { NfcOrder } from "@shared/schema";

export async function sendNfcOrderConfirmationEmail(order: NfcOrder): Promise<void> {
  const from = process.env.SMTP_FROM || "HolaRevi <info@holarevi.com>";
  const smtp = getTransporter();
  const orderRef = order.id.slice(0, 8).toUpperCase();
  const totalFormatted = ((order.totalCents ?? 2500) / 100).toFixed(2).replace(".", ",");

  const subject = `✅ Pedido confirmado — Stand NFC HolaRevi #${orderRef}`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Pedido confirmado — HolaRevi</title>
<style>
  body { margin: 0; padding: 0; background: #f4f7fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  .wrapper { max-width: 600px; margin: 0 auto; padding: 32px 16px; }
  .card { background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #2563EB 0%, #1d4ed8 100%); padding: 40px 40px 36px; text-align: center; }
  .header-logo { color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 20px; }
  .header-check { width: 64px; height: 64px; background: rgba(255,255,255,0.15); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 32px; margin-bottom: 16px; }
  .header-title { color: #ffffff; font-size: 24px; font-weight: 700; margin: 0 0 8px; }
  .header-sub { color: rgba(255,255,255,0.8); font-size: 15px; margin: 0; }
  .body { padding: 36px 40px; }
  .greeting { font-size: 16px; color: #374151; margin: 0 0 24px; line-height: 1.6; }
  .order-box { background: #f8faff; border: 1.5px solid #e0e7ff; border-radius: 12px; padding: 24px; margin-bottom: 28px; }
  .order-box-title { font-size: 12px; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 16px; }
  .order-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
  .order-row:last-child { border-bottom: none; padding-bottom: 0; }
  .order-label { font-size: 14px; color: #6b7280; }
  .order-value { font-size: 14px; font-weight: 600; color: #111827; text-align: right; }
  .order-total-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 0 0; margin-top: 4px; }
  .order-total-label { font-size: 16px; font-weight: 700; color: #111827; }
  .order-total-value { font-size: 20px; font-weight: 800; color: #2563EB; }
  .section-title { font-size: 14px; font-weight: 700; color: #111827; margin: 0 0 12px; }
  .shipping-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px 24px; margin-bottom: 28px; }
  .shipping-text { font-size: 14px; color: #374151; line-height: 1.7; margin: 0; }
  .timeline { margin-bottom: 28px; }
  .timeline-item { display: flex; gap: 16px; margin-bottom: 16px; align-items: flex-start; }
  .timeline-dot { width: 32px; height: 32px; border-radius: 50%; background: #eff6ff; border: 2px solid #bfdbfe; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; margin-top: 2px; }
  .timeline-dot.active { background: #2563EB; border-color: #2563EB; color: white; }
  .timeline-content { flex: 1; }
  .timeline-label { font-size: 14px; font-weight: 600; color: #111827; margin: 0 0 2px; }
  .timeline-desc { font-size: 13px; color: #6b7280; margin: 0; }
  .cta-section { text-align: center; padding: 28px 0 8px; }
  .cta-btn { display: inline-block; background: linear-gradient(135deg, #2563EB, #1d4ed8); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 10px; }
  .cta-desc { font-size: 13px; color: #6b7280; margin: 12px 0 0; }
  .footer { padding: 24px 40px 32px; text-align: center; border-top: 1px solid #f3f4f6; }
  .footer-text { font-size: 12px; color: #9ca3af; line-height: 1.6; margin: 0; }
  .footer-brand { font-weight: 700; color: #6b7280; }
  .badge { display: inline-block; background: #dcfce7; color: #15803d; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; margin-bottom: 16px; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <div class="header-logo">HolaRevi</div>
      <div class="header-check">✅</div>
      <h1 class="header-title">¡Tu pedido está confirmado!</h1>
      <p class="header-sub">Referencia: #${orderRef}</p>
    </div>

    <div class="body">
      <p class="greeting">Hola <strong>${order.firstName}</strong>,<br /><br />
      ¡Gracias por tu pedido! Tu NFC Stand está reservado y lo estamos preparando con todo el mimo.
      En cuanto salga de nuestro almacén te enviaremos el número de seguimiento por email.</p>

      <div class="order-box">
        <p class="order-box-title">Resumen del pedido</p>
        <div class="order-row">
          <span class="order-label">Producto</span>
          <span class="order-value">Stand NFC HolaRevi</span>
        </div>
        <div class="order-row">
          <span class="order-label">Cantidad</span>
          <span class="order-value">${order.quantity ?? 1} unidad${(order.quantity ?? 1) > 1 ? "es" : ""}</span>
        </div>
        <div class="order-row">
          <span class="order-label">Envío</span>
          <span class="order-value" style="color:#15803d;">Gratis · España Península</span>
        </div>
        <div class="order-total-row">
          <span class="order-total-label">Total pagado</span>
          <span class="order-total-value">${totalFormatted}€</span>
        </div>
      </div>

      <div class="shipping-box">
        <p class="section-title">📦 Dirección de envío</p>
        <p class="shipping-text">
          ${order.firstName} ${order.lastName}${order.company ? `<br />${order.company}` : ""}<br />
          ${order.address}<br />
          ${order.postalCode} ${order.city}${order.province ? `, ${order.province}` : ""}<br />
          España
        </p>
      </div>

      <p class="section-title">¿Qué pasa ahora?</p>
      <div class="timeline">
        <div class="timeline-item">
          <div class="timeline-dot active">✓</div>
          <div class="timeline-content">
            <p class="timeline-label">Pedido confirmado</p>
            <p class="timeline-desc">Tu pago se ha procesado correctamente.</p>
          </div>
        </div>
        <div class="timeline-item">
          <div class="timeline-dot">🎨</div>
          <div class="timeline-content">
            <p class="timeline-label">Personalización</p>
            <p class="timeline-desc">Nuestro equipo prepara tu stand con la configuración de tu Google Business.</p>
          </div>
        </div>
        <div class="timeline-item">
          <div class="timeline-dot">📦</div>
          <div class="timeline-content">
            <p class="timeline-label">Envío</span></p>
            <p class="timeline-desc">Recibirás el tracking en cuanto salga. Estimado: Q1 2026. Envío gratuito.</p>
          </div>
        </div>
        <div class="timeline-item">
          <div class="timeline-dot">🚀</div>
          <div class="timeline-content">
            <p class="timeline-label">Listo para usar</p>
            <p class="timeline-desc">Ponlo en el mostrador y empieza a recibir reseñas en segundos.</p>
          </div>
        </div>
      </div>

      <div class="cta-section">
        <a href="https://holarevi.com" class="cta-btn">Empezar con HolaRevi →</a>
        <p class="cta-desc">Activa la plataforma para responder reseñas con IA mientras esperas tu stand.</p>
      </div>
    </div>

    <div class="footer">
      <p class="footer-text">
        <span class="footer-brand">HolaRevi</span> — El copiloto de reseñas para negocios locales<br />
        ¿Tienes alguna pregunta? Escríbenos a <a href="mailto:info@holarevi.com" style="color:#2563EB;">info@holarevi.com</a><br /><br />
        Garantía de devolución 30 días · Pago procesado por Stripe
      </p>
    </div>
  </div>
</div>
</body>
</html>`;

  const text = `Pedido confirmado — Stand NFC HolaRevi #${orderRef}\n\nHola ${order.firstName},\n\nTu pedido está confirmado. Referencia: #${orderRef}\nTotal: ${totalFormatted}€\n\nEnvío a: ${order.address}, ${order.postalCode} ${order.city}, España\n\n¿Preguntas? info@holarevi.com`;

  await smtp.sendMail({ from, to: order.email, subject, html, text });
  console.log(`[NFC Shop] Confirmation email sent to ${order.email} for order #${orderRef}`);
}
