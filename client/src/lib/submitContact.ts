import type { ContactFormData } from "@shared/contact";

const FORMSUBMIT_ENDPOINT =
  "https://formsubmit.co/ajax/engineering@designanywhere.org";

/** FormSubmit has `_cc` but no BCC field. jordanbell@ is CC'd on every lead. */
const CONTACT_CC = "jordanbell@designanywhere.org";

type FormSubmitResponse = {
  success?: string | boolean;
  message?: string;
};

function isSuccess(res: Response, payload: FormSubmitResponse | null): boolean {
  if (!res.ok) return false;
  if (!payload) return false;
  return payload.success === true || payload.success === "true";
}

/**
 * POST the contact form to FormSubmit (no server, no API keys).
 * The Express `/api/contact` Resend path remains available for local use.
 */
export async function submitContactForm(data: ContactFormData): Promise<void> {
  const res = await fetch(FORMSUBMIT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      service: data.service,
      subject: data.subject,
      message: data.message,
      _replyto: data.email,
      _cc: CONTACT_CC,
      _subject: `[Contact Form] ${data.service} — ${data.subject}`,
      _template: "table",
      _captcha: "false",
    }),
  });

  const payload = (await res.json().catch(() => null)) as FormSubmitResponse | null;

  if (!isSuccess(res, payload)) {
    throw new Error(
      payload?.message || "Failed to send message. Please try again.",
    );
  }
}
