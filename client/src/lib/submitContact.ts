import type { ContactFormData } from "@shared/contact";

/**
 * Where the contact form POSTs JSON.
 * Served by the Vercel function in `services/lead-api` (`POST /api/lead`).
 */
export const CONTACT_ENDPOINT = "https://api.designanywhere.org/api/lead";

export const CONTACT_TO = "engineering@designanywhere.org";

/** Mailto fallback only. The API sends a real Bcc; mailto has no Bcc field. */
export const CONTACT_CC = "jordanbell@designanywhere.org";

/** Give up on the form backend and open the visitor's email app. */
export const CONTACT_SUBMIT_TIMEOUT_MS = 10_000;

/**
 * Whole mailto URL limit. Long links get dropped or truncated by mail apps,
 * which would lose the lead we are trying to save.
 */
export const MAX_MAILTO_LENGTH = 2000;

const TRUNCATION_NOTE =
  "\n\n[Your message was shortened so it would fit in an email link. Please add anything that was cut off before you send.]";

type ContactApiBody = {
  success?: string | boolean;
  message?: string;
};

export type ContactSubmitResult =
  | { status: "sent" }
  | { status: "mailto"; mailtoHref: string; truncated: boolean };

export type SubmitContactOptions = {
  /** Honeypot value. Bots fill this; people leave it empty. */
  honey?: string;
  /** Page URL sent as `_url`. Defaults to `location.href`. */
  pageUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  openMailto?: (href: string) => void;
};

export function contactSubjectLine(
  data: Pick<ContactFormData, "service" | "subject">,
): string {
  const subject = data.subject.replace(/[\r\n]+/g, " ").trim();
  return `[Contact Form] ${data.service} — ${subject}`;
}

export function buildContactPayload(
  data: ContactFormData,
  options: { honey?: string; pageUrl?: string } = {},
): Record<string, string> {
  return {
    type: "contact",
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    service: data.service,
    subject: data.subject,
    message: data.message,
    _honey: options.honey ?? "",
    _url: options.pageUrl ?? "",
  };
}

function mentionsActivation(message: unknown): boolean {
  return typeof message === "string" && /activation/i.test(message);
}

/**
 * Decide whether the backend accepted the lead.
 * `success: true` is received, including `{ emailed: true, emailId }` and
 * `{ emailed: false }` after the lead was stored. A JSON `message` that mentions activation still counts as
 * received so an old FormSubmit confirmation response is not a visitor failure.
 */
export function interpretContactResponse(
  status: number,
  bodyText: string,
): "sent" | "failed" {
  let payload: ContactApiBody | null = null;
  const trimmed = bodyText.trim();
  if (trimmed) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") {
        payload = parsed as ContactApiBody;
      }
    } catch {
      payload = null;
    }
  }

  if (mentionsActivation(payload?.message)) return "sent";

  const ok = status >= 200 && status < 300;
  if (!ok || !payload) return "failed";
  if (payload.success === true || payload.success === "true") return "sent";
  return "failed";
}

function mailtoPreamble(data: ContactFormData): string {
  return [
    `Name: ${data.firstName} ${data.lastName}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone}`,
    `Service: ${data.service}`,
    `Subject: ${data.subject}`,
    "",
    "Message:",
    "",
  ].join("\n");
}

function formatMailto(subject: string, body: string): string {
  const query = [
    `cc=${encodeURIComponent(CONTACT_CC)}`,
    `subject=${encodeURIComponent(subject)}`,
    `body=${encodeURIComponent(body)}`,
  ].join("&");
  return `mailto:${CONTACT_TO}?${query}`;
}

function shrinkMailtoToLimit(subject: string, body: string): string {
  let subjectText = subject;
  let bodyText = body;
  let href = formatMailto(subjectText, bodyText);
  while (href.length > MAX_MAILTO_LENGTH && (bodyText.length > 0 || subjectText.length > 0)) {
    if (bodyText.length > 0) {
      const next = Math.max(0, bodyText.length - Math.ceil(bodyText.length * 0.25) - 1);
      bodyText = bodyText.slice(0, next);
    } else {
      const next = Math.max(0, subjectText.length - Math.ceil(subjectText.length * 0.25) - 1);
      subjectText = subjectText.slice(0, next);
    }
    href = formatMailto(subjectText, bodyText);
  }
  return href;
}

/** Prefill the visitor's mail app with everything they entered. */
export function buildContactMailto(data: ContactFormData): {
  href: string;
  truncated: boolean;
} {
  const subject = contactSubjectLine(data);
  const preamble = mailtoPreamble(data);
  const fullHref = formatMailto(subject, `${preamble}${data.message}`);
  if (fullHref.length <= MAX_MAILTO_LENGTH) {
    return { href: fullHref, truncated: false };
  }

  let lo = 0;
  let hi = data.message.length;
  let best = 0;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const body = `${preamble}${data.message.slice(0, mid).trimEnd()}${TRUNCATION_NOTE}`;
    if (formatMailto(subject, body).length <= MAX_MAILTO_LENGTH) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  const shortened = data.message.slice(0, best).trimEnd();
  let body = `${preamble}${shortened}${TRUNCATION_NOTE}`;
  let href = formatMailto(subject, body);
  if (href.length > MAX_MAILTO_LENGTH) {
    body = `${preamble}${shortened}`;
    href = formatMailto(subject, body);
  }
  if (href.length > MAX_MAILTO_LENGTH) {
    href = shrinkMailtoToLimit(subject, body);
  }
  return { href, truncated: true };
}

/** Hand the mailto to the OS mail handler without leaving this page if we can. */
export function openMailtoLink(href: string): void {
  if (typeof window === "undefined") return;
  window.location.href = href;
}

function pageUrlFromLocation(): string {
  if (typeof location === "undefined" || typeof location.href !== "string") return "";
  return location.href;
}

function fallbackMailto(
  data: ContactFormData,
  openMailto: (href: string) => void,
): ContactSubmitResult {
  const mailto = buildContactMailto(data);
  try {
    openMailto(mailto.href);
  } catch (err) {
    console.info("[contact] could not open email app", err);
  }
  return {
    status: "mailto",
    mailtoHref: mailto.href,
    truncated: mailto.truncated,
  };
}

/**
 * POST the contact form. On any delivery failure, open a prefilled mailto so
 * the lead is not lost.
 */
export async function submitContactForm(
  data: ContactFormData,
  options: SubmitContactOptions = {},
): Promise<ContactSubmitResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const openMailto = options.openMailto ?? openMailtoLink;
  const timeoutMs = options.timeoutMs ?? CONTACT_SUBMIT_TIMEOUT_MS;
  const pageUrl = options.pageUrl ?? pageUrlFromLocation();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetchImpl(CONTACT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(
        buildContactPayload(data, { honey: options.honey ?? "", pageUrl }),
      ),
      signal: controller.signal,
    });

    const bodyText = await res.text();
    console.info("[contact] response", { status: res.status, body: bodyText });

    if (interpretContactResponse(res.status, bodyText) === "sent") {
      return { status: "sent" };
    }
  } catch (err) {
    console.info("[contact] request failed", err);
  } finally {
    clearTimeout(timer);
  }

  return fallbackMailto(data, openMailto);
}
