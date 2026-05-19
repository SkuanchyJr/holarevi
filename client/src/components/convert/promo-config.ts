// TODO: ajustar fecha de fin de la oferta de lanzamiento.
// Si la fecha ya pasó, PromoBar y badges anclados a esta config se ocultan automáticamente.
// Formato ISO 8601, zona Europe/Madrid implícita por el ISO.
export const LAUNCH_OFFER_END_AT = "2026-06-30T23:59:59+02:00";

// TODO: ajustar precio de lanzamiento y precio "post-lanzamiento" (al que subirá).
// Estos precios se muestran como "Precio de lanzamiento" (legalmente defendible)
// — NO como "PVP antes/ahora" (regulado por Directiva Omnibus 2019/2161 en UE/ES).
// Para activar el modo "tachado anclaje" agresivo, poner STRIKETHROUGH_MODE = true,
// con la advertencia de que requiere haber aplicado realmente el precio anterior
// durante los últimos 30 días.
export const STRIKETHROUGH_MODE = false;

export const PROMO = {
  // TODO: reemplazar por descuento real (% off del precio de lanzamiento vs precio futuro).
  percentOff: 60,
  // TODO: ajustar plazas/cupos disponibles si quieres aplicar escasez real.
  spotsLeft: 23,
};

export function isPromoActive(now: Date = new Date()): boolean {
  return now.getTime() < new Date(LAUNCH_OFFER_END_AT).getTime();
}
