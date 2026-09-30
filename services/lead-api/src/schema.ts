import { z } from "zod";

/** Mirrors the visitor-facing limits in `shared/contact.ts`, with phone, service, and subject optional for later quote requests. */
const MAX_MESSAGE = 5000;
const MAX_ESTIMATE_JSON = 20_000;

const estimateLineSchema = z
  .object({
    id: z.string().max(80).optional(),
    label: z.string().max(200).optional(),
    rate: z.number().finite().optional(),
    hours: z.number().finite().nullable().optional(),
    cost: z.number().finite().nullable().optional(),
    note: z.string().max(500).optional(),
    error: z.string().max(500).nullable().optional(),
  })
  .passthrough();

export const estimateSchema = z
  .object({
    /** Plain-language project description from the pricing-page scheduler. */
    description: z.string().max(5_000).optional(),
    /** Per-service hours from Schedule your project. */
    services: z.array(estimateLineSchema).max(40).optional(),
    /** Same line shape, used by older quote payloads. */
    lines: z.array(estimateLineSchema).max(40).optional(),
    total: z.number().finite().optional(),
    anyHours: z.boolean().optional(),
    hasInvalid: z.boolean().optional(),
  })
  .passthrough();

export const leadRequestSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .max(100, "First name must be at most 100 characters")
      .optional(),
    lastName: z
      .string()
      .trim()
      .max(100, "Last name must be at most 100 characters")
      .optional(),
    name: z.string().trim().max(200, "Name must be at most 200 characters").optional(),
    email: z
      .string()
      .trim()
      .email("Please enter a valid email address")
      .max(320, "Email must be at most 320 characters"),
    phone: z.string().trim().max(40, "Phone number must be at most 40 characters").optional(),
    service: z.string().trim().max(200, "Service must be at most 200 characters").optional(),
    subject: z.string().trim().max(200, "Subject must be at most 200 characters").optional(),
    message: z.string().max(MAX_MESSAGE, "Message must be at most 5,000 characters"),
    type: z.enum(["contact", "quote"]).optional(),
    estimate: estimateSchema.nullish(),
    _url: z.string().trim().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (!displayName(data)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Name is required",
        path: ["name"],
      });
    }
    if (data.estimate && JSON.stringify(data.estimate).length > MAX_ESTIMATE_JSON) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Estimate is too large.",
        path: ["estimate"],
      });
    }
  });

export type LeadRequest = z.infer<typeof leadRequestSchema>;

export function displayName(data: {
  name?: string;
  firstName?: string;
  lastName?: string;
}): string {
  const explicit = data.name?.trim();
  if (explicit) return explicit;
  return [data.firstName?.trim(), data.lastName?.trim()].filter(Boolean).join(" ");
}

/** Bots that fill the hidden field get a fake success and are not stored. */
export function honeypotTripped(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const value = (body as Record<string, unknown>)._honey;
  if (typeof value === "string") return value.trim() !== "";
  return value != null && value !== false;
}
