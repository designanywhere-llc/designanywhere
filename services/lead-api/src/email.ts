import { displayName, type LeadRequest } from "./schema";

/**
 * Same HTML escaping as the legacy Express handler in `server/contact.ts`.
 * Every visitor-controlled value is escaped before it is placed in HTML.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const DEFAULT_FROM = "Design Anywhere <leads@contact.designanywhere.org>";
export const DEFAULT_TO = "engineering@designanywhere.org";
export const DEFAULT_BCC = "jordanbell@designanywhere.org";

export type LeadEmail = {
  from: string;
  to: string;
  bcc: string;
  replyTo: string;
  subject: string;
  text: string;
  html: string;
};

type EstimateLine = {
  id?: string;
  label?: string;
  hours?: number | null;
  cost?: number | null;
  rate?: number;
};

function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function estimatePlain(estimate: LeadRequest["estimate"]): string | null {
  if (!estimate) return null;
  const lines = (estimate.lines ?? []) as EstimateLine[];
  const rows: string[] = [];
  for (const line of lines) {
    const label = (line.label || line.id || "").trim();
    const bits = [
      label,
      line.hours != null ? `${line.hours} h` : "",
      line.rate != null ? `$${line.rate}/h` : "",
      line.cost != null ? `$${line.cost}` : "",
    ].filter(Boolean);
    if (bits.length) rows.push(`- ${bits.join(" · ")}`);
  }
  if (typeof estimate.total === "number") rows.push(`Total: $${estimate.total}`);
  return rows.length ? rows.join("\n") : null;
}

export function leadSubject(data: LeadRequest): string {
  const topic =
    data.subject?.trim() ||
    data.service?.trim() ||
    (data.type === "quote" ? "Quote request" : "Contact");
  const subject = `New lead: ${oneLine(topic)} — ${oneLine(displayName(data))}`;
  return subject.length > 180 ? `${subject.slice(0, 177)}...` : subject;
}

export function buildLeadEmail(
  data: LeadRequest,
  id: string,
  env: { CONTACT_FROM_EMAIL?: string; CONTACT_TO_EMAIL?: string; CONTACT_BCC_EMAIL?: string },
): LeadEmail {
  const name = displayName(data);
  const rows: Array<[string, string]> = [
    ["Name", name],
    ["Email", data.email],
  ];
  if (data.phone) rows.push(["Phone", data.phone]);
  if (data.service) rows.push(["Service", data.service]);
  if (data.subject) rows.push(["Subject", data.subject]);
  rows.push(["Type", data.type ?? "contact"]);
  if (data._url) rows.push(["Page", data._url]);
  rows.push(["Lead id", id]);

  const estimate = estimatePlain(data.estimate);
  const text = [
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    "Message:",
    data.message,
    ...(estimate ? ["", "Estimate:", estimate] : []),
  ].join("\n");

  const rowHtml = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px 6px 0;font-weight:600;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:6px 0;">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  const estimateHtml = estimate
    ? `<h3 style="margin:20px 0 8px;">Estimate</h3><pre style="white-space:pre-wrap;margin:0;font-family:inherit;">${escapeHtml(estimate)}</pre>`
    : "";

  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a;">
      <h2 style="margin:0 0 16px;">New lead</h2>
      <table style="border-collapse:collapse;">${rowHtml}</table>
      <h3 style="margin:20px 0 8px;">Message</h3>
      <p style="white-space:pre-wrap;margin:0;">${escapeHtml(data.message)}</p>
      ${estimateHtml}
    </div>
  `;

  return {
    from: env.CONTACT_FROM_EMAIL?.trim() || DEFAULT_FROM,
    to: env.CONTACT_TO_EMAIL?.trim() || DEFAULT_TO,
    bcc: env.CONTACT_BCC_EMAIL?.trim() || DEFAULT_BCC,
    replyTo: data.email,
    subject: leadSubject(data),
    text,
    html,
  };
}

/** Shape passed to Resend. `bcc` is a real blind copy, not a Cc header. */
export function toResendPayload(message: LeadEmail): {
  from: string;
  to: string[];
  bcc: string[];
  replyTo: string;
  subject: string;
  text: string;
  html: string;
} {
  return {
    from: message.from,
    to: [message.to],
    bcc: [message.bcc],
    replyTo: message.replyTo,
    subject: message.subject,
    text: message.text,
    html: message.html,
  };
}
