import { getTransporter } from "./emailSender";

export interface SendEmailResult {
  success: boolean;
  error?: string;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  context = "email",
): Promise<SendEmailResult> {
  const from = process.env.SMTP_FROM || "HolaRevi <info@holarevi.com>";
  const maxRetries = 2;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const smtp = getTransporter();
      const text = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      await smtp.sendMail({ from, to, subject, html, text });
      console.log(`[${context}] Email sent to ${to}`);
      return { success: true };
    } catch (error: any) {
      console.error(
        `[${context}] SMTP error (attempt ${attempt}/${maxRetries}) to ${to}:`,
        error?.message || error,
      );
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      return { success: false, error: error?.message || "Unknown SMTP error" };
    }
  }
  return { success: false, error: "Max retries exceeded" };
}
