import { absoluteUrl } from "@/lib/utils";

/**
 * Branded transactional email templates. Table-based, inline-styled HTML
 * for broad email-client support, each with a plain-text twin.
 */

export interface Rendered {
  subject: string;
  html: string;
  text: string;
}

interface Brand {
  businessName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function layout(brand: Brand, opts: { preheader: string; heading: string; bodyHtml: string; cta?: { label: string; url: string } }): string {
  const footer = [brand.address, brand.phone, brand.email].filter(Boolean).map((v) => esc(String(v))).join(" &nbsp;·&nbsp; ");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.heading)}</title></head>
<body style="margin:0;padding:0;background:#F5F4F0;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F4F0;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border:1px solid #E4E1D8;">
<tr><td style="background:#101114;padding:28px 36px;">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:4px;color:#FFFFFF;">BALINGER</div>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:6px;color:#C9A66B;font-weight:bold;margin-top:2px;">AUTOS</div>
</td></tr>
<tr><td style="padding:36px;font-family:Arial,Helvetica,sans-serif;color:#101114;">
<h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:26px;line-height:1.25;">${esc(opts.heading)}</h1>
<div style="font-size:15px;line-height:1.7;color:#3A3D44;">${opts.bodyHtml}</div>
${
  opts.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;"><tr><td style="background:#C9A66B;"><a href="${esc(opts.cta.url)}" style="display:inline-block;padding:15px 26px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:1.5px;color:#101114;text-decoration:none;text-transform:uppercase;">${esc(opts.cta.label)}</a></td></tr></table>`
    : ""
}
</td></tr>
<tr><td style="padding:22px 36px;border-top:1px solid #ECE9E1;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#5B5E66;">
${esc(brand.businessName)} — Driven by Excellence. Defined by Trust.${footer ? `<br>${footer}` : ""}
</td></tr>
</table></td></tr></table></body></html>`;
}

function rows(items: Array<[string, string | null | undefined]>): { html: string; text: string } {
  const filtered = items.filter((r): r is [string, string] => Boolean(r[1]));
  return {
    html: `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:18px 0;border-top:1px solid #ECE9E1;">${filtered
      .map(
        ([k, v]) =>
          `<tr><td style="padding:9px 0;border-bottom:1px solid #ECE9E1;color:#5B5E66;font-size:13px;width:40%;">${esc(k)}</td><td style="padding:9px 0;border-bottom:1px solid #ECE9E1;font-size:14px;font-weight:bold;color:#101114;">${esc(v).replace(/\n/g, "<br>")}</td></tr>`,
      )
      .join("")}</table>`,
    text: filtered.map(([k, v]) => `${k}: ${v}`).join("\n"),
  };
}

// ── Customer acknowledgement ─────────────────────────────────────────

export function customerAcknowledgement(
  brand: Brand,
  input: { name: string; reference: string; typeLabel: string; vehicleTitle?: string | null; vehicleUrl?: string | null },
): Rendered {
  const details = rows([
    ["Reference", input.reference],
    ["Request", input.typeLabel],
    ["Vehicle", input.vehicleTitle],
  ]);
  const intro = `Thank you, ${input.name}. We've received your request and a member of our sales team will be in touch shortly.`;
  return {
    subject: `We've received your request — ${input.reference}`,
    html: layout(brand, {
      preheader: `Reference ${input.reference}`,
      heading: "Thank you for your enquiry",
      bodyHtml: `<p style="margin:0;">${esc(intro)}</p>${details.html}<p style="margin:0;">If you need to add anything, simply reply to this email and quote your reference.</p>`,
      cta: input.vehicleUrl ? { label: "View vehicle", url: input.vehicleUrl } : { label: "Browse inventory", url: absoluteUrl("/inventory") },
    }),
    text: `${intro}\n\n${details.text}\n\nReply to this email and quote your reference to add anything.\n\n${brand.businessName}`,
  };
}

// ── Staff notification of a new lead ────────────────────────────────

export function staffNewLead(
  brand: Brand,
  input: {
    reference: string;
    typeLabel: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string | null;
    vehicleTitle?: string | null;
    details: Array<[string, string | null | undefined]>;
    message?: string | null;
    adminUrl: string;
  },
): Rendered {
  const table = rows([
    ["Reference", input.reference],
    ["Type", input.typeLabel],
    ["Customer", input.customerName],
    ["Email", input.customerEmail],
    ["Phone", input.customerPhone],
    ["Vehicle", input.vehicleTitle],
    ...input.details,
    ["Message", input.message],
  ]);
  return {
    subject: `New ${input.typeLabel.toLowerCase()} — ${input.customerName} (${input.reference})`,
    html: layout(brand, {
      preheader: `${input.typeLabel} from ${input.customerName}`,
      heading: `New ${input.typeLabel.toLowerCase()}`,
      bodyHtml: table.html,
      cta: { label: "Open in dashboard", url: input.adminUrl },
    }),
    text: `${table.text}\n\nOpen: ${input.adminUrl}`,
  };
}

// ── Test drive / appointment lifecycle ───────────────────────────────

export function appointmentUpdate(
  brand: Brand,
  input: {
    name: string;
    kind: "requested" | "confirmed" | "rescheduled" | "rejected" | "cancelled";
    vehicleTitle: string;
    when: string;
    reference?: string | null;
    note?: string | null;
  },
): Rendered {
  const copy = {
    requested: { subject: "Test drive request received", heading: "Your test drive request", line: "We've received your test drive request. We'll confirm your appointment shortly." },
    confirmed: { subject: "Your test drive is confirmed", heading: "Your test drive is confirmed", line: "We look forward to welcoming you to the showroom." },
    rescheduled: { subject: "Your test drive has a new time", heading: "Your test drive has been rescheduled", line: "Your appointment has moved to the time below. If it doesn't suit you, reply and we'll find another." },
    rejected: { subject: "About your test drive request", heading: "We couldn't confirm that time", line: "Unfortunately we're unable to confirm your requested time. Reply to this email or call us and we'll arrange an alternative." },
    cancelled: { subject: "Your test drive has been cancelled", heading: "Your test drive has been cancelled", line: "Your appointment has been cancelled. We'd be happy to arrange another time." },
  }[input.kind];
  const table = rows([
    ["Vehicle", input.vehicleTitle],
    [input.kind === "requested" ? "Requested time" : "Time", input.when],
    ["Reference", input.reference],
    ["Note", input.note],
  ]);
  const greeting = `Dear ${input.name},`;
  return {
    subject: copy.subject,
    html: layout(brand, {
      preheader: `${input.vehicleTitle} · ${input.when}`,
      heading: copy.heading,
      bodyHtml: `<p style="margin:0 0 10px;">${esc(greeting)}</p><p style="margin:0;">${esc(copy.line)}</p>${table.html}`,
    }),
    text: `${greeting}\n\n${copy.line}\n\n${table.text}\n\n${brand.businessName}`,
  };
}

// ── Contact form ────────────────────────────────────────────────────

export function staffContactMessage(
  brand: Brand,
  input: { name: string; email: string; phone: string | null; category: string; subject: string | null; message: string; adminUrl: string },
): Rendered {
  const table = rows([
    ["From", input.name],
    ["Email", input.email],
    ["Phone", input.phone],
    ["Category", input.category],
    ["Subject", input.subject],
    ["Message", input.message],
  ]);
  return {
    subject: `New contact message — ${input.name}`,
    html: layout(brand, { preheader: input.subject ?? input.category, heading: "New contact message", bodyHtml: table.html, cta: { label: "Open in dashboard", url: input.adminUrl } }),
    text: `${table.text}\n\nOpen: ${input.adminUrl}`,
  };
}

// ── Payments ────────────────────────────────────────────────────────

export function paymentReceipt(
  brand: Brand,
  input: { name: string; reference: string; amountLabel: string; vehicleTitle: string; vehicleUrl: string; holdUntil: string | null; needsRefund: boolean },
): Rendered {
  const table = rows([
    ["Payment reference", input.reference],
    ["Amount paid", input.amountLabel],
    ["Vehicle", input.vehicleTitle],
    ["Reserved until", input.holdUntil],
  ]);
  const line = input.needsRefund
    ? "Thank you for your payment. Unfortunately this vehicle was reserved by another customer moments before your payment completed. Your deposit will be refunded in full, and our team will contact you to help find an alternative."
    : "Thank you — your reservation deposit has been received and the vehicle is now reserved for you. A member of our sales team will contact you to arrange the next steps.";
  return {
    subject: input.needsRefund ? `About your payment ${input.reference}` : `Reservation confirmed — ${input.vehicleTitle}`,
    html: layout(brand, {
      preheader: `${input.amountLabel} · ${input.reference}`,
      heading: input.needsRefund ? "Your deposit will be refunded" : "Your vehicle is reserved",
      bodyHtml: `<p style="margin:0 0 10px;">Dear ${esc(input.name)},</p><p style="margin:0;">${esc(line)}</p>${table.html}<p style="margin:0;font-size:13px;color:#5B5E66;">The deposit is part-payment towards the vehicle. Keep this email as your receipt.</p>`,
      cta: { label: "View vehicle", url: input.vehicleUrl },
    }),
    text: `Dear ${input.name},\n\n${line}\n\n${table.text}\n\nThe deposit is part-payment towards the vehicle. Keep this email as your receipt.\n\n${brand.businessName}`,
  };
}

export function staffPaymentAlert(
  brand: Brand,
  input: { reference: string; amountLabel: string; vehicleTitle: string; customerName: string; customerEmail: string; needsRefund: boolean; adminUrl: string },
): Rendered {
  const table = rows([
    ["Reference", input.reference],
    ["Amount", input.amountLabel],
    ["Vehicle", input.vehicleTitle],
    ["Customer", `${input.customerName} (${input.customerEmail})`],
    ["Action", input.needsRefund ? "REFUND REQUIRED — vehicle was no longer available" : "Vehicle marked as reserved. Contact the customer."],
  ]);
  return {
    subject: input.needsRefund ? `Refund needed — ${input.reference}` : `Deposit received — ${input.vehicleTitle}`,
    html: layout(brand, { preheader: input.amountLabel, heading: input.needsRefund ? "Payment needs a refund" : "Reservation deposit received", bodyHtml: table.html, cta: { label: "Open payments", url: input.adminUrl } }),
    text: `${table.text}\n\nOpen: ${input.adminUrl}`,
  };
}
