import "server-only";

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export type EmailResult = { sent: true; id: string } | { sent: false; reason: string };

/**
 * Sends via the Resend REST API. Never throws: email failure must not
 * break a customer's submission, so problems are logged and reported.
 */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.info(`[email] skipped (Resend not configured): "${message.subject}" → ${String(message.to)}`);
    return { sent: false, reason: "not_configured" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: Array.isArray(message.to) ? message.to : [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        reply_to: message.replyTo,
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[email] Resend ${res.status}: ${body.slice(0, 300)}`);
      return { sent: false, reason: `http_${res.status}` };
    }
    const data = (await res.json()) as { id?: string };
    return { sent: true, id: data.id ?? "" };
  } catch (error) {
    console.error("[email] send failed", error);
    return { sent: false, reason: "network" };
  }
}

/** Where staff notifications go: env override, else the site's public email. */
export function adminRecipient(siteEmail: string | null): string | null {
  return process.env.ADMIN_NOTIFICATION_EMAIL || siteEmail || null;
}
