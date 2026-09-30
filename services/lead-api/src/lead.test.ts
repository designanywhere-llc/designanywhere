import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { DEFAULT_BCC, DEFAULT_FROM, DEFAULT_TO, toResendPayload, type LeadEmail } from "./email";
import {
  handleLead,
  isPrivateAccessUnsupported,
  type BlobPutOptions,
  type LeadDeps,
} from "./lead";
import { resetLeadRateLimits } from "./rate-limit";
import { leadRequestSchema } from "./schema";

const validContact = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  phone: "555-0100",
  service: "Product Design",
  subject: "Prototype quote",
  message: "Need a bracket redesigned for machining.",
  type: "contact",
  _honey: "",
  _url: "https://designanywhere.org/contact",
};

type BlobCall = { pathname: string; body: string; options: BlobPutOptions };

function productionEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    NODE_ENV: "production",
    BLOB_READ_WRITE_TOKEN: "test-blob-token",
    RESEND_API_KEY: "test-resend-key",
    ...overrides,
  };
}

function harness(options: {
  env?: Record<string, string | undefined>;
  putBlob?: LeadDeps["putBlob"];
  sendEmail?: LeadDeps["sendEmail"];
} = {}) {
  const blobs: BlobCall[] = [];
  const emails: LeadEmail[] = [];
  const order: string[] = [];
  const deps: LeadDeps = {
    env: options.env ?? productionEnv(),
    now: () => new Date("2026-09-30T16:18:00.000Z"),
    randomId: () => "abc123",
    putBlob: options.putBlob ?? (async (pathname, body, blobOptions) => {
      order.push("blob");
      blobs.push({ pathname, body, options: blobOptions });
      return { pathname, url: "https://example.private.blob.vercel-storage.com/" + pathname };
    }),
    sendEmail: options.sendEmail ?? (async (message) => {
      order.push("email");
      emails.push(message);
    }),
  };
  return { deps, blobs, emails, order };
}

function post(
  body: unknown,
  headers: Record<string, string> = {},
  method = "POST",
): Request {
  return new Request("https://api.designanywhere.org/api/lead", {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: "https://designanywhere.org",
      "X-Forwarded-For": "203.0.113.10",
      ...headers,
    },
    body: method === "GET" || method === "OPTIONS" ? undefined : JSON.stringify(body),
  });
}

async function read(response: Response): Promise<{ status: number; json: Record<string, unknown>; headers: Headers }> {
  const text = await response.text();
  let json: Record<string, unknown> = {};
  if (text) json = JSON.parse(text) as Record<string, unknown>;
  return { status: response.status, json, headers: response.headers };
}

beforeEach(() => {
  resetLeadRateLimits();
});

describe("leadRequestSchema", () => {
  it("accepts the contact form payload and a quote with an estimate", () => {
    assert.equal(leadRequestSchema.safeParse(validContact).success, true);
    const quote = leadRequestSchema.safeParse({
      name: "Grace Hopper",
      email: "grace@example.com",
      message: "Please price this.",
      type: "quote",
      estimate: {
        total: 850,
        lines: [{ id: "product-design", label: "Product Design", rate: 85, hours: 10, cost: 850 }],
      },
    });
    assert.equal(quote.success, true);
  });

  it("allows omitted phone, service, and subject", () => {
    const parsed = leadRequestSchema.safeParse({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      message: "Hello there.",
    });
    assert.equal(parsed.success, true);
  });

  it("rejects a message over 5,000 characters, a bad email, and a missing name", () => {
    const tooLong = leadRequestSchema.safeParse({ ...validContact, message: "A".repeat(5001) });
    assert.equal(tooLong.success, false);
    if (!tooLong.success) {
      assert.equal(tooLong.error.issues[0]?.message, "Message must be at most 5,000 characters");
    }
    assert.equal(leadRequestSchema.safeParse({ ...validContact, message: "A".repeat(5000) }).success, true);

    const badEmail = leadRequestSchema.safeParse({ ...validContact, email: "not-an-email" });
    assert.equal(badEmail.success, false);
    if (!badEmail.success) {
      assert.equal(badEmail.error.issues[0]?.message, "Please enter a valid email address");
    }

    const noName = leadRequestSchema.safeParse({
      email: "ada@example.com",
      message: "Hello there.",
    });
    assert.equal(noName.success, false);
    if (!noName.success) {
      assert.equal(noName.error.issues[0]?.message, "Name is required");
    }

    assert.equal(leadRequestSchema.safeParse({ ...validContact, type: "other" }).success, false);
  });
});

describe("handleLead", () => {
  it("writes the blob before sending email and returns the lead id", async () => {
    const { deps, blobs, emails, order } = harness();
    const response = await read(await handleLead(post(validContact), deps));

    assert.equal(response.status, 200);
    assert.deepEqual(response.json, {
      success: true,
      id: "2026-09-30T16:18:00.000Z-abc123",
    });
    assert.deepEqual(order.slice(0, 2), ["blob", "email"]);
    assert.equal(blobs[0]?.options.access, "private");
    assert.equal(blobs[0]?.options.addRandomSuffix, false);
    assert.equal(
      blobs[0]?.pathname,
      "leads/2026/09/2026-09-30T16:18:00.000Z-abc123.json",
    );
    const stored = JSON.parse(blobs[0]?.body ?? "{}") as { email?: string; _honey?: string; pageUrl?: string };
    assert.equal(stored.email, "ada@example.com");
    assert.equal(stored.pageUrl, "https://designanywhere.org/contact");
    assert.equal(stored._honey, undefined);
    assert.equal(emails[0]?.to, DEFAULT_TO);
    assert.equal(emails[0]?.bcc, DEFAULT_BCC);
    assert.equal(emails[0]?.from, DEFAULT_FROM);
    assert.equal(emails[0]?.replyTo, "ada@example.com");
    assert.equal(emails[0]?.subject, "New lead: Prototype quote — Ada Lovelace");
    const resend = toResendPayload(emails[0]!);
    assert.deepEqual(resend.bcc, [DEFAULT_BCC]);
    assert.equal("cc" in resend, false);
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://designanywhere.org");
    assert.equal(JSON.stringify(response.json).includes("blob.vercel-storage.com"), false);
  });

  it("escapes HTML and prefers subject over service in the subject line", async () => {
    const { deps, emails } = harness();
    await handleLead(
      post({
        ...validContact,
        subject: "Hello <script>",
        message: `Line\n<script>alert("x")</script>`,
      }),
      deps,
    );
    assert.equal(emails[0]?.subject, "New lead: Hello <script> — Ada Lovelace");
    assert.match(emails[0]?.html ?? "", /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
    assert.equal((emails[0]?.html ?? "").includes("<script>"), false);
    assert.match(emails[0]?.text ?? "", /<script>alert\("x"\)<\/script>/);
  });

  it("returns success for a filled honeypot and does not store or email", async () => {
    const { deps, blobs, emails } = harness();
    const response = await read(
      await handleLead(post({ ...validContact, _honey: "https://spam.example" }), deps),
    );
    assert.equal(response.status, 200);
    assert.equal(response.json.success, true);
    assert.equal(typeof response.json.id, "string");
    assert.equal(blobs.length, 0);
    assert.equal(emails.length, 0);
  });

  it("treats a blank honeypot as a real lead", async () => {
    const { deps, blobs } = harness();
    const response = await read(await handleLead(post({ ...validContact, _honey: "   " }), deps));
    assert.equal(response.status, 200);
    assert.equal(response.json.success, true);
    assert.equal(blobs.length > 0, true);
  });

  it("allows only configured origins, plus localhost outside production", async () => {
    const allowed = harness();
    const ok = await read(await handleLead(post(validContact), allowed.deps));
    assert.equal(ok.headers.get("Access-Control-Allow-Origin"), "https://designanywhere.org");

    const www = harness();
    const wwwRes = await read(
      await handleLead(post(validContact, { Origin: "https://www.designanywhere.org" }), www.deps),
    );
    assert.equal(wwwRes.status, 200);
    assert.equal(wwwRes.headers.get("Access-Control-Allow-Origin"), "https://www.designanywhere.org");

    const evil = harness();
    const denied = await read(
      await handleLead(post(validContact, { Origin: "https://evil.example" }), evil.deps),
    );
    assert.equal(denied.status, 403);
    assert.equal(denied.json.success, false);
    assert.equal(denied.headers.get("Access-Control-Allow-Origin"), null);
    assert.equal(evil.blobs.length, 0);

    const preflight = harness();
    const options = await handleLead(
      new Request("https://api.designanywhere.org/api/lead", {
        method: "OPTIONS",
        headers: { Origin: "https://designanywhere.org", "Access-Control-Request-Method": "POST" },
      }),
      preflight.deps,
    );
    assert.equal(options.status, 204);
    assert.equal(options.headers.get("Access-Control-Allow-Origin"), "https://designanywhere.org");
    assert.equal(options.headers.get("Access-Control-Allow-Methods"), "POST, OPTIONS");

    const badPreflight = await handleLead(
      new Request("https://api.designanywhere.org/api/lead", {
        method: "OPTIONS",
        headers: { Origin: "https://evil.example" },
      }),
      harness().deps,
    );
    assert.equal(badPreflight.status, 403);
    assert.equal(badPreflight.headers.get("Access-Control-Allow-Origin"), null);

    const prodLocal = harness();
    const localDenied = await read(
      await handleLead(post(validContact, { Origin: "http://localhost:5173" }), prodLocal.deps),
    );
    assert.equal(localDenied.status, 403);

    const devLocal = harness({ env: productionEnv({ NODE_ENV: "development" }) });
    const localOk = await read(
      await handleLead(post(validContact, { Origin: "http://localhost:5173" }), devLocal.deps),
    );
    assert.equal(localOk.status, 200);
    assert.equal(localOk.headers.get("Access-Control-Allow-Origin"), "http://localhost:5173");

    const custom = harness({
      env: productionEnv({ CONTACT_ALLOWED_ORIGIN: "https://preview.example, https://other.example" }),
    });
    const customOk = await read(
      await handleLead(post(validContact, { Origin: "https://other.example" }), custom.deps),
    );
    assert.equal(customOk.status, 200);
    const customDenied = await read(
      await handleLead(post(validContact, { Origin: "https://designanywhere.org", "X-Forwarded-For": "203.0.113.99" }), custom.deps),
    );
    assert.equal(customDenied.status, 403);
  });

  it("does not email when the blob write fails, and hides the internal error", async () => {
    const { deps, emails } = harness({
      putBlob: async () => {
        throw new Error("disk full\n    at Blob.put (blob.js:1:1)");
      },
    });
    const response = await read(await handleLead(post(validContact), deps));
    assert.equal(response.status, 503);
    assert.deepEqual(response.json, { success: false, error: "Contact form is temporarily unavailable." });
    assert.equal(JSON.stringify(response.json).includes("disk full"), false);
    assert.equal(JSON.stringify(response.json).includes("blob.js"), false);
    assert.equal(emails.length, 0);
  });

  it("does not publish publicly when the token is rejected", async () => {
    let calls = 0;
    const { deps } = harness({
      putBlob: async () => {
        calls += 1;
        throw new Error("Access denied, please provide a valid token for this resource.");
      },
    });
    const response = await read(await handleLead(post(validContact), deps));
    assert.equal(response.status, 503);
    assert.equal(response.json.success, false);
    assert.equal(calls, 1);
    assert.equal(isPrivateAccessUnsupported(new Error("Access denied, please provide a valid token for this resource.")), false);
  });

  it("falls back to a public unguessable blob when private access is unsupported, then emails", async () => {
    const calls: BlobPutOptions[] = [];
    const order: string[] = [];
    const { deps } = harness({
      putBlob: async (pathname, _body, options) => {
        order.push(`blob:${options.access}`);
        calls.push(options);
        if (options.access === "private") {
          throw new Error("Blob access private is not supported for this public store");
        }
        return { pathname: `${pathname.replace(/\.json$/, "")}-suffix.json`, url: "https://public.example/secret" };
      },
      sendEmail: async () => {
        order.push("email");
      },
    });
    const response = await read(await handleLead(post(validContact), deps));
    assert.equal(response.status, 200);
    assert.equal(response.json.success, true);
    assert.deepEqual(order.slice(0, 3), ["blob:private", "blob:public", "email"]);
    assert.equal(calls[1]?.access, "public");
    assert.equal(calls[1]?.addRandomSuffix, true);
    assert.equal(JSON.stringify(response.json).includes("public.example"), false);
  });

  it("still returns success when email fails after the blob is saved, and records the failure", async () => {
    const { deps, blobs } = harness({
      sendEmail: async () => {
        throw new Error("smtp down\n    at Resend.send (resend.js:9:1)");
      },
    });
    const response = await read(await handleLead(post(validContact), deps));
    assert.equal(response.status, 200);
    assert.deepEqual(response.json, {
      success: true,
      id: "2026-09-30T16:18:00.000Z-abc123",
      emailed: false,
    });
    assert.equal(JSON.stringify(response.json).includes("smtp down"), false);
    assert.equal(JSON.stringify(response.json).includes("resend.js"), false);
    assert.equal(blobs[0]?.options.allowOverwrite, false);
    const update = JSON.parse(blobs[1]?.body ?? "{}") as { emailed?: boolean; emailError?: string };
    assert.equal(blobs[1]?.options.allowOverwrite, true);
    assert.equal(blobs[1]?.pathname, blobs[0]?.pathname);
    assert.equal(update.emailed, false);
    assert.match(update.emailError ?? "", /smtp down/);
    assert.equal((update.emailError ?? "").includes("resend.js"), false);
  });

  it("writes an email-failure sidecar when the blob cannot be updated", async () => {
    let writes = 0;
    const paths: string[] = [];
    const { deps } = harness({
      putBlob: async (pathname, _body, options) => {
        writes += 1;
        paths.push(pathname);
        if (writes === 1) return { pathname };
        if (options.allowOverwrite && pathname.endsWith(".json") && !pathname.endsWith(".email-error.json")) {
          throw new Error("overwrite failed");
        }
        return { pathname };
      },
      sendEmail: async () => {
        throw new Error("mailbox full");
      },
    });
    const response = await read(await handleLead(post(validContact), deps));
    assert.equal(response.json.success, true);
    assert.equal(response.json.emailed, false);
    assert.equal(
      paths.at(-1),
      "leads/2026/09/2026-09-30T16:18:00.000Z-abc123.email-error.json",
    );
  });

  it("rate limits repeated posts from the same IP before storing another lead", async () => {
    const { deps, blobs } = harness();
    for (let i = 0; i < 5; i += 1) {
      const response = await read(
        await handleLead(post(validContact, { "X-Forwarded-For": "198.51.100.8" }), deps),
      );
      assert.equal(response.status, 200, `attempt ${i + 1}`);
    }
    const blocked = await read(
      await handleLead(post(validContact, { "X-Forwarded-For": "198.51.100.8" }), deps),
    );
    assert.equal(blocked.status, 429);
    assert.equal(blocked.json.success, false);
    assert.equal(blobs.filter((call) => call.options.allowOverwrite === false).length, 5);
  });

  it("rejects invalid JSON and the wrong method without storing", async () => {
    const { deps, blobs } = harness();
    const invalid = await handleLead(
      new Request("https://api.designanywhere.org/api/lead", {
        method: "POST",
        headers: { Origin: "https://designanywhere.org", "Content-Type": "application/json" },
        body: "{",
      }),
      deps,
    );
    const invalidBody = await read(invalid);
    assert.equal(invalidBody.status, 400);
    assert.equal(invalidBody.json.error, "Invalid JSON.");

    const get = await read(await handleLead(post(validContact, {}, "GET"), deps));
    assert.equal(get.status, 405);
    assert.equal(blobs.length, 0);
  });

  it("stores a quote estimate and uses service when subject is omitted", async () => {
    const { deps, blobs, emails } = harness();
    const response = await read(
      await handleLead(
        post(
          {
            name: "Grace Hopper",
            email: "grace@example.com",
            message: "Quote please",
            type: "quote",
            service: "Machine & Tooling Design",
            estimate: { total: 100, lines: [{ label: "Tooling <b>", hours: 1, cost: 100 }] },
          },
          { "X-Forwarded-For": "203.0.113.50" },
        ),
        deps,
      ),
    );
    assert.equal(response.status, 200);
    assert.equal(response.json.success, true);
    const stored = JSON.parse(blobs[0]?.body ?? "{}") as { type?: string; estimate?: { total?: number } };
    assert.equal(stored.type, "quote");
    assert.equal(stored.estimate?.total, 100);
    assert.equal(emails[0]?.subject, "New lead: Machine & Tooling Design — Grace Hopper");
    assert.match(emails[0]?.html ?? "", /Tooling &lt;b&gt;/);
  });
});
