import { randomBytes } from "node:crypto";
import { corsHeaders, type LeadEnv } from "./cors";
import { buildLeadEmail, type LeadEmail } from "./email";
import { isRateLimited } from "./rate-limit";
import { displayName, honeypotTripped, leadRequestSchema, type LeadRequest } from "./schema";

export type BlobAccess = "private" | "public";

export type BlobPutOptions = {
  access: BlobAccess;
  addRandomSuffix?: boolean;
  allowOverwrite?: boolean;
  contentType?: string;
  cacheControlMaxAge?: number;
};

export type BlobPutResult = {
  pathname: string;
  url?: string;
};

export type LeadDeps = {
  env: LeadEnv;
  putBlob: (pathname: string, body: string, options: BlobPutOptions) => Promise<BlobPutResult>;
  sendEmail: (message: LeadEmail) => Promise<void>;
  now?: () => Date;
  randomId?: () => string;
};

type StoredLead = {
  id: string;
  receivedAt: string;
  type: "contact" | "quote";
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  service?: string;
  subject?: string;
  message: string;
  estimate?: LeadRequest["estimate"];
  pageUrl?: string;
  emailed: boolean;
  emailError: string | null;
};

const UNAVAILABLE = "Contact form is temporarily unavailable.";

export function leadBlobPath(now: Date, randomId: string): { id: string; pathname: string } {
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const id = `${now.toISOString()}-${randomId}`;
  return { id, pathname: `leads/${year}/${month}/${id}.json` };
}

export function isPrivateAccessUnsupported(err: unknown): boolean {
  const message = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (!message.includes("private")) return false;
  return (
    message.includes("not supported") ||
    message.includes("unsupported") ||
    message.includes("public store") ||
    message.includes("access mismatch") ||
    message.includes('must be "public"') ||
    message.includes("must be 'public'")
  );
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 200);
  }
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 200);
  return "unknown";
}

function errorText(err: unknown): string {
  const raw = err instanceof Error ? err.message : "Email failed";
  const message = raw
    .split("\n")
    .filter((line) => !/^\s*at\s+/.test(line))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
  return message || "Email failed";
}

function jsonResponse(
  status: number,
  body: Record<string, unknown>,
  cors: Headers | null,
): Response {
  const headers = new Headers(cors ?? undefined);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(body), { status, headers });
}

function blankToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function storedLead(data: LeadRequest, id: string, receivedAt: string): StoredLead {
  return {
    id,
    receivedAt,
    type: data.type ?? "contact",
    name: displayName(data),
    firstName: blankToUndefined(data.firstName),
    lastName: blankToUndefined(data.lastName),
    email: data.email,
    phone: blankToUndefined(data.phone),
    service: blankToUndefined(data.service),
    subject: blankToUndefined(data.subject),
    message: data.message,
    estimate: data.estimate ?? undefined,
    pageUrl: blankToUndefined(data._url),
    emailed: false,
    emailError: null,
  };
}

function putOptions(access: BlobAccess, overwrite: boolean, randomSuffix: boolean): BlobPutOptions {
  return {
    access,
    addRandomSuffix: randomSuffix,
    allowOverwrite: overwrite,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  };
}

function sidecarPath(pathname: string): string {
  return pathname.endsWith(".json")
    ? pathname.replace(/\.json$/, ".email-error.json")
    : `${pathname}.email-error.json`;
}

async function rememberEmailResult(
  deps: LeadDeps,
  access: BlobAccess,
  pathname: string,
  record: StoredLead,
): Promise<void> {
  const body = JSON.stringify(record, null, 2);
  try {
    await deps.putBlob(pathname, body, putOptions(access, true, false));
    return;
  } catch (err) {
    console.error("Could not update lead blob with email status", errorText(err));
  }
  try {
    await deps.putBlob(
      sidecarPath(pathname),
      JSON.stringify(
        {
          id: record.id,
          emailed: record.emailed,
          emailError: record.emailError,
          at: record.receivedAt,
        },
        null,
        2,
      ),
      putOptions(access, true, false),
    );
  } catch (err) {
    console.error("Could not write lead email-status sidecar", errorText(err));
  }
}

export async function handleLead(request: Request, deps: LeadDeps): Promise<Response> {
  let origin: string | null = null;
  try {
    origin = request.headers.get("origin");
    return await handleLeadInner(request, deps, origin);
  } catch (err) {
    console.error("Lead handler failed", errorText(err));
    return jsonResponse(500, { success: false, error: UNAVAILABLE }, corsHeaders(origin, deps.env));
  }
}

async function handleLeadInner(
  request: Request,
  deps: LeadDeps,
  origin: string | null,
): Promise<Response> {
  const cors = corsHeaders(origin, deps.env);

  if (request.method === "OPTIONS") {
    if (origin && !cors) {
      return new Response(null, { status: 403, headers: { "Cache-Control": "no-store" } });
    }
    const headers = new Headers(cors ?? undefined);
    headers.set("Cache-Control", "no-store");
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { success: false, error: "Method not allowed." }, cors);
  }

  if (origin && !cors) {
    return jsonResponse(403, { success: false, error: "Origin not allowed." }, null);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { success: false, error: "Invalid JSON." }, cors);
  }

  if (honeypotTripped(body)) {
    const id = `${new Date().toISOString()}-${deps.randomId?.() ?? randomBytes(16).toString("hex")}`;
    return jsonResponse(200, { success: true, id }, cors);
  }

  if (isRateLimited(clientIp(request))) {
    return jsonResponse(
      429,
      { success: false, error: "Too many requests. Please try again later." },
      cors,
    );
  }

  const parsed = leadRequestSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonResponse(400, { success: false, error: first?.message ?? "Invalid form data." }, cors);
  }

  if (!deps.env.BLOB_READ_WRITE_TOKEN) {
    console.error("BLOB_READ_WRITE_TOKEN is not set; cannot store lead.");
    return jsonResponse(503, { success: false, error: UNAVAILABLE }, cors);
  }

  const now = deps.now?.() ?? new Date();
  const randomId = deps.randomId?.() ?? randomBytes(16).toString("hex");
  const planned = leadBlobPath(now, randomId);
  const record = storedLead(parsed.data, planned.id, now.toISOString());
  const initialBody = JSON.stringify(record, null, 2);

  let access: BlobAccess = "private";
  let pathname = planned.pathname;
  try {
    const stored = await deps.putBlob(planned.pathname, initialBody, putOptions("private", false, false));
    pathname = stored.pathname || planned.pathname;
  } catch (err) {
    if (!isPrivateAccessUnsupported(err)) {
      console.error("Failed to store lead blob", errorText(err));
      return jsonResponse(503, { success: false, error: UNAVAILABLE }, cors);
    }
    access = "public";
    try {
      const stored = await deps.putBlob(
        planned.pathname,
        initialBody,
        putOptions("public", false, true),
      );
      pathname = stored.pathname || planned.pathname;
    } catch (publicErr) {
      console.error("Failed to store lead blob", errorText(publicErr));
      return jsonResponse(503, { success: false, error: UNAVAILABLE }, cors);
    }
  }

  try {
    await deps.sendEmail(buildLeadEmail(parsed.data, planned.id, deps.env));
  } catch (err) {
    console.error("Lead was stored but email failed", errorText(err));
    await rememberEmailResult(deps, access, pathname, {
      ...record,
      emailed: false,
      emailError: errorText(err),
    });
    return jsonResponse(200, { success: true, id: planned.id, emailed: false }, cors);
  }

  await rememberEmailResult(deps, access, pathname, {
    ...record,
    emailed: true,
    emailError: null,
  });
  return jsonResponse(200, { success: true, id: planned.id }, cors);
}
