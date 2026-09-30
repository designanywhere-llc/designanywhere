import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import type { ContactFormData } from "../../../shared/contact";
import {
  CONTACT_CC,
  CONTACT_ENDPOINT,
  CONTACT_SUBMIT_TIMEOUT_MS,
  CONTACT_TO,
  MAX_MAILTO_LENGTH,
  buildContactMailto,
  buildContactPayload,
  interpretContactResponse,
  submitContactForm,
} from "./submitContact";

const sample: ContactFormData = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  phone: "555-0100",
  service: "Product Design",
  subject: "Prototype quote",
  message: "We need a prototype for a handheld enclosure.",
};

function mailtoParts(href: string): { to: string; cc: string | null; subject: string | null; body: string | null } {
  assert.ok(href.startsWith(`mailto:${CONTACT_TO}?`), href);
  const url = new URL(href);
  return {
    to: CONTACT_TO,
    cc: url.searchParams.get("cc"),
    subject: url.searchParams.get("subject"),
    body: url.searchParams.get("body"),
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  mock.restoreAll();
});

describe("buildContactMailto", () => {
  it("prefills recipient, cc, subject, and every field the visitor entered", () => {
    const { href, truncated } = buildContactMailto({
      ...sample,
      message: "Line 1\nLine 2 & <more>",
    });
    const parts = mailtoParts(href);

    assert.equal(truncated, false);
    assert.equal(parts.to, "engineering@designanywhere.org");
    assert.equal(parts.cc, "jordanbell@designanywhere.org");
    assert.equal(parts.subject, "[Contact Form] Product Design — Prototype quote");
    assert.match(parts.body ?? "", /Name: Ada Lovelace/);
    assert.match(parts.body ?? "", /Email: ada@example.com/);
    assert.match(parts.body ?? "", /Phone: 555-0100/);
    assert.match(parts.body ?? "", /Service: Product Design/);
    assert.match(parts.body ?? "", /Subject: Prototype quote/);
    assert.match(parts.body ?? "", /Line 1\nLine 2 & <more>/);
    assert.ok(href.length <= MAX_MAILTO_LENGTH);
  });

  it("truncates a very long message and keeps the mailto within the length limit", () => {
    const { href, truncated } = buildContactMailto({
      ...sample,
      message: "A".repeat(5000),
    });
    const parts = mailtoParts(href);

    assert.equal(truncated, true);
    assert.ok(href.length <= MAX_MAILTO_LENGTH);
    assert.match(parts.body ?? "", /Name: Ada Lovelace/);
    assert.match(parts.body ?? "", /Email: ada@example.com/);
    assert.match(parts.body ?? "", /Phone: 555-0100/);
    assert.match(parts.body ?? "", /Service: Product Design/);
    assert.match(parts.body ?? "", /Subject: Prototype quote/);
    assert.match(parts.body ?? "", /shortened so it would fit/);
    assert.ok((parts.body ?? "").length < 5000);
  });
});

describe("interpretContactResponse", () => {
  it("treats a JSON message that mentions activation as received", () => {
    const body = JSON.stringify({
      success: "false",
      message:
        "This form needs Activation. We've sent you an email containing an Activate Form link.",
    });
    assert.equal(interpretContactResponse(200, body), "sent");
    assert.equal(interpretContactResponse(422, body), "sent");
  });

  it("accepts success true and rejects other outcomes", () => {
    assert.equal(
      interpretContactResponse(200, JSON.stringify({ success: "true", message: "ok" })),
      "sent",
    );
    assert.equal(
      interpretContactResponse(200, JSON.stringify({ success: true })),
      "sent",
    );
    assert.equal(
      interpretContactResponse(200, JSON.stringify({ success: false, message: "nope" })),
      "failed",
    );
    assert.equal(interpretContactResponse(200, "<html>not json</html>"), "failed");
    assert.equal(interpretContactResponse(500, JSON.stringify({ success: true })), "failed");
    assert.equal(interpretContactResponse(200, ""), "failed");
  });
});

describe("submitContactForm", () => {
  it("posts to the configured endpoint with honeypot and page url", async () => {
    let requested: { url: string; init: RequestInit } | undefined;
    const opened: string[] = [];
    const result = await submitContactForm(sample, {
      honey: "",
      pageUrl: "https://designanywhere.org/contact",
      openMailto: (href) => opened.push(href),
      fetchImpl: async (url, init) => {
        requested = { url: String(url), init: init ?? {} };
        return jsonResponse(200, { success: "true", message: "The form was submitted successfully." });
      },
    });

    assert.deepEqual(result, { status: "sent" });
    assert.deepEqual(opened, []);
    assert.equal(requested?.url, CONTACT_ENDPOINT);
    assert.equal(CONTACT_ENDPOINT, "https://formsubmit.co/ajax/engineering@designanywhere.org");
    const headers = new Headers(requested?.init.headers);
    assert.equal(headers.get("Content-Type"), "application/json");
    assert.equal(headers.get("Accept"), "application/json");
    assert.equal(
      requested?.init.body,
      JSON.stringify(
        buildContactPayload(sample, {
          honey: "",
          pageUrl: "https://designanywhere.org/contact",
        }),
      ),
    );
    const payload = JSON.parse(String(requested?.init.body)) as Record<string, string>;
    assert.equal(payload._honey, "");
    assert.equal(payload._url, "https://designanywhere.org/contact");
    assert.equal(payload._cc, CONTACT_CC);
    assert.equal(payload._replyto, sample.email);
  });

  it("includes a filled honeypot in the payload", async () => {
    let body = "";
    await submitContactForm(sample, {
      honey: "https://spam.example",
      pageUrl: "https://designanywhere.org/contact",
      openMailto: () => {},
      fetchImpl: async (_url, init) => {
        body = String(init?.body ?? "");
        return jsonResponse(200, { success: true });
      },
    });
    const payload = JSON.parse(body) as Record<string, string>;
    assert.equal(payload._honey, "https://spam.example");
  });

  it("logs status and body, then opens a prefilled mailto when the response is not JSON", async () => {
    const info = mock.method(console, "info", () => {});
    const opened: string[] = [];
    const html = "<html>FormSubmit is down</html>";
    const result = await submitContactForm(sample, {
      pageUrl: "https://designanywhere.org/contact",
      openMailto: (href) => opened.push(href),
      fetchImpl: async () => new Response(html, { status: 200, headers: { "Content-Type": "text/html" } }),
    });

    const expected = buildContactMailto(sample);
    assert.equal(result.status, "mailto");
    if (result.status === "mailto") {
      assert.equal(result.mailtoHref, expected.href);
      assert.equal(result.truncated, expected.truncated);
    }
    assert.deepEqual(opened, [expected.href]);
    const parts = mailtoParts(opened[0] ?? "");
    assert.equal(parts.cc, CONTACT_CC);
    assert.match(parts.body ?? "", /Ada Lovelace/);
    assert.match(parts.body ?? "", /ada@example.com/);
    assert.match(parts.body ?? "", /555-0100/);
    assert.match(parts.body ?? "", /Product Design/);
    assert.match(parts.body ?? "", /Prototype quote/);
    assert.match(parts.body ?? "", /handheld enclosure/);

    const logged = info.mock.calls.some((call) => {
      const detail = call.arguments[1] as { status?: number; body?: string } | undefined;
      return call.arguments[0] === "[contact] response" && detail?.status === 200 && detail.body === html;
    });
    assert.equal(logged, true);
  });

  it("falls back to mailto on non-OK, success false, network error, and timeout", async () => {
    const cases: Array<{ name: string; fetchImpl: typeof fetch }> = [
      {
        name: "non-ok",
        fetchImpl: async () => jsonResponse(502, { success: false, message: "bad gateway" }),
      },
      {
        name: "success false",
        fetchImpl: async () => jsonResponse(200, { success: false, message: "rejected" }),
      },
      {
        name: "network",
        fetchImpl: async () => {
          throw new TypeError("Failed to fetch");
        },
      },
      {
        name: "timeout",
        fetchImpl: (_url, init) =>
          new Promise((_resolve, reject) => {
            const signal = init?.signal;
            if (!signal) {
              reject(new Error("missing abort signal"));
              return;
            }
            signal.addEventListener("abort", () => {
              reject(Object.assign(new Error("The operation was aborted"), { name: "AbortError" }));
            });
          }),
      },
    ];

    for (const testCase of cases) {
      const opened: string[] = [];
      const result = await submitContactForm(sample, {
        timeoutMs: testCase.name === "timeout" ? 20 : CONTACT_SUBMIT_TIMEOUT_MS,
        pageUrl: "https://designanywhere.org/contact",
        openMailto: (href) => opened.push(href),
        fetchImpl: testCase.fetchImpl,
      });
      assert.equal(result.status, "mailto", testCase.name);
      assert.equal(opened.length, 1, testCase.name);
      const parts = mailtoParts(opened[0] ?? "");
      assert.equal(parts.subject, "[Contact Form] Product Design — Prototype quote", testCase.name);
      assert.match(parts.body ?? "", /Name: Ada Lovelace/, testCase.name);
      assert.match(parts.body ?? "", /Email: ada@example.com/, testCase.name);
      assert.match(parts.body ?? "", /Phone: 555-0100/, testCase.name);
      assert.match(parts.body ?? "", /Service: Product Design/, testCase.name);
      assert.match(parts.body ?? "", /Subject: Prototype quote/, testCase.name);
      assert.match(parts.body ?? "", /handheld enclosure/, testCase.name);
    }
  });

  it("does not open mailto when the JSON message mentions activation", async () => {
    const info = mock.method(console, "info", () => {});
    const opened: string[] = [];
    const body = JSON.stringify({
      success: false,
      message: "This form needs Activation.",
    });
    const result = await submitContactForm(sample, {
      openMailto: (href) => opened.push(href),
      fetchImpl: async () => new Response(body, { status: 200, headers: { "Content-Type": "application/json" } }),
    });

    assert.deepEqual(result, { status: "sent" });
    assert.deepEqual(opened, []);
    const logged = info.mock.calls.some((call) => {
      const detail = call.arguments[1] as { status?: number; body?: string } | undefined;
      return call.arguments[0] === "[contact] response" && detail?.status === 200 && detail.body === body;
    });
    assert.equal(logged, true);
  });

  it("uses a 10 second default timeout", () => {
    assert.equal(CONTACT_SUBMIT_TIMEOUT_MS, 10_000);
  });

  it("sends a quote with type, estimate, name, and a readable message", async () => {
    const estimate = {
      description: "Handheld kitchen gadget with a 3D printed prototype.",
      services: [
        {
          id: "product-design",
          label: "Product Design",
          hours: 24,
          rate: 85,
          cost: 2040,
        },
      ],
      total: 2040,
    };
    const quote = {
      ...sample,
      subject: "Schedule my project",
      message: [
        "Project description:",
        estimate.description,
        "",
        "This is a ballpark. Your final quote follows a free consultation.",
        "",
        "Product Design: 24 hrs × $85/hr = $2,040",
        "Estimated total: $2,040",
        "Initial consultation: Free",
      ].join("\n"),
      type: "quote" as const,
      estimate,
    };

    let body = "";
    const sent = await submitContactForm(quote, {
      honey: "",
      pageUrl: "https://designanywhere.org/pricing",
      openMailto: () => {},
      fetchImpl: async (_url, init) => {
        body = String(init?.body ?? "");
        return jsonResponse(200, { success: true });
      },
    });
    assert.deepEqual(sent, { status: "sent" });

    const payload = JSON.parse(body) as Record<string, unknown>;
    assert.equal(payload.name, "Ada Lovelace");
    assert.equal(payload.email, quote.email);
    assert.equal(payload.phone, quote.phone);
    assert.equal(payload.service, quote.service);
    assert.equal(payload.subject, "Schedule my project");
    assert.equal(payload.type, "quote");
    assert.equal(payload._honey, "");
    assert.equal(payload._cc, CONTACT_CC);
    assert.equal(payload._replyto, quote.email);
    assert.deepEqual(payload.estimate, estimate);
    assert.match(String(payload.message), /Handheld kitchen gadget/);
    assert.match(String(payload.message), /Product Design: 24 hrs/);
    assert.match(String(payload.message), /Estimated total: \$2,040/);
    assert.match(String(payload.message), /free consultation/);

    const opened: string[] = [];
    const failed = await submitContactForm(quote, {
      pageUrl: "https://designanywhere.org/pricing",
      openMailto: (href) => opened.push(href),
      fetchImpl: async () => jsonResponse(502, { success: false }),
    });
    assert.equal(failed.status, "mailto");
    const parts = mailtoParts(opened[0] ?? "");
    assert.match(parts.body ?? "", /Handheld kitchen gadget/);
    assert.match(parts.body ?? "", /Estimated total: \$2,040/);
    assert.match(parts.body ?? "", /Ada Lovelace/);
  });
});
