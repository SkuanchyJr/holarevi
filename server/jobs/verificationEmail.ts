import crypto from "crypto";
import { sendEmail } from "./sendEmail";

const TOKEN_TTL_HOURS = 24;

export function generateVerificationToken(): {
  token: string;
  expiresAt: Date;
} {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);
  return { token, expiresAt };
}

function getAppUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") return "https://holarevi.com";
  const replitDomains = process.env.REPLIT_DOMAINS;
  if (replitDomains) return `https://${replitDomains.split(",")[0]}`;
  return "http://localhost:5000";
}

interface SendVerificationParams {
  to: string;
  firstName?: string | null;
  token: string;
  language?: string | null;
}

export async function sendVerificationEmail({
  to,
  firstName,
  token,
  language,
}: SendVerificationParams) {
  const lang = language === "en" ? "en" : "es";
  const verifyUrl = `${getAppUrl()}/api/auth/verify-email?token=${token}`;

  const copy =
    lang === "en"
      ? {
          subject: "Confirm your email — HolaRevi",
          greeting: firstName ? `Hi ${firstName},` : "Hi,",
          intro:
            "Thanks for signing up to HolaRevi. To activate your account, please confirm this email address.",
          cta: "Confirm my email",
          fallback:
            "If the button doesn't work, copy and paste this link into your browser:",
          expiry: `This link expires in ${TOKEN_TTL_HOURS} hours.`,
          ignore:
            "If you didn't create a HolaRevi account, you can safely ignore this email.",
          footer: "HolaRevi · Reseñas con IA",
        }
      : {
          subject: "Confirma tu correo — HolaRevi",
          greeting: firstName ? `Hola ${firstName},` : "Hola,",
          intro:
            "Gracias por registrarte en HolaRevi. Para activar tu cuenta, confirma esta dirección de correo.",
          cta: "Confirmar mi correo",
          fallback:
            "Si el botón no funciona, copia y pega este enlace en tu navegador:",
          expiry: `Este enlace caduca en ${TOKEN_TTL_HOURS} horas.`,
          ignore:
            "Si no creaste una cuenta en HolaRevi, puedes ignorar este correo.",
          footer: "HolaRevi · Reseñas con IA",
        };

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;">
        <tr><td style="padding:32px 32px 16px;">
          <h1 style="margin:0 0 12px;font-size:20px;color:#111827;">${copy.greeting}</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#374151;">${copy.intro}</p>
          <p style="margin:0 0 24px;text-align:center;">
            <a href="${verifyUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;font-size:15px;">${copy.cta}</a>
          </p>
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">${copy.fallback}</p>
          <p style="margin:0 0 20px;font-size:12px;word-break:break-all;color:#2563eb;">
            <a href="${verifyUrl}" style="color:#2563eb;text-decoration:none;">${verifyUrl}</a>
          </p>
          <p style="margin:0 0 8px;font-size:12px;color:#6b7280;">${copy.expiry}</p>
          <p style="margin:0;font-size:12px;color:#6b7280;">${copy.ignore}</p>
        </td></tr>
        <tr><td style="padding:16px 32px 28px;border-top:1px solid #f1f5f9;font-size:11px;color:#9ca3af;text-align:center;">
          ${copy.footer}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return sendEmail(to, copy.subject, html, "VerificationEmail");
}

export const VERIFICATION_TOKEN_TTL_HOURS = TOKEN_TTL_HOURS;
