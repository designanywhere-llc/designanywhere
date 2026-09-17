import type { Request, Response } from "express";
import { Resend } from "resend";
import { contactSchema } from "../shared/contact";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 5;

const hits = new Map<string, number[]>();

const DEFAULT_TO = "engineering@designanywhere.org";
const DEFAULT_BCC = "jordanbell@designanywhere.org";
/** Sandbox default works without a verified domain. Set CONTACT_FROM_EMAIL to leads@designanywhere.org after verifying the domain in Resend. */
const DEFAULT_FROM = "Design Anywhere <onboarding@resend.dev>";

function clientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildTextBody(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  service: string;
  subject: string;
  message: string;
}): string {
  return [
    `Name: ${data.firstName} ${data.lastName}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone}`,
    `Service: ${data.service}`,
    `Subject: ${data.subject}`,
    "",
    "Message:",
    data.message,
  ].join("\n");
}

function buildHtmlBody(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  service: string;
  subject: string;
  message: string;
}): string {
  const rows = [
    ["Name", `${data.firstName} ${data.lastName}`],
    ["Email", data.email],
    ["Phone", data.phone],
    ["Service", data.service],
    ["Subject", data.subject],
  ];

  const rowHtml = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px 6px 0;font-weight:600;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:6px 0;">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  return `
    <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a;">
      <h2 style="margin:0 0 16px;">New contact form submission</h2>
      <table style="border-collapse:collapse;">${rowHtml}</table>
      <h3 style="margin:20px 0 8px;">Message</h3>
      <p style="white-space:pre-wrap;margin:0;">${escapeHtml(data.message)}</p>
    </div>
  `;
}

export async function handleContact(req: Request, res: Response) {
  if (isRateLimited(clientIp(req))) {
    return res.status(429).json({
      success: false,
      error: "Too many requests. Please try again later.",
    });
  }

  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return res.status(400).json({
      success: false,
      error: first?.message ?? "Invalid form data.",
    });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set; cannot send contact email.");
    return res.status(503).json({
      success: false,
      error: "Contact form is temporarily unavailable.",
    });
  }

  const data = parsed.data;
  const resend = new Resend(apiKey);

  try {
    const { error } = await resend.emails.send({
      from: process.env.CONTACT_FROM_EMAIL || DEFAULT_FROM,
      to: [process.env.CONTACT_TO_EMAIL || DEFAULT_TO],
      bcc: [process.env.CONTACT_BCC_EMAIL || DEFAULT_BCC],
      replyTo: data.email,
      subject: `[Contact Form] ${data.service} — ${data.subject}`,
      text: buildTextBody(data),
      html: buildHtmlBody(data),
    });

    if (error) {
      console.error("Resend failed to send contact email:", error);
      return res.status(502).json({
        success: false,
        error: "We couldn't send your message. Please try again.",
      });
    }
  } catch (err) {
    console.error("Resend threw while sending contact email:", err);
    return res.status(502).json({
      success: false,
      error: "We couldn't send your message. Please try again.",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Your message has been sent.",
  });
}
