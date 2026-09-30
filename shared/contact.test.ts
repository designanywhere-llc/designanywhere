import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contactSchema } from "./contact";

const valid = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  phone: "555-0100",
  service: "Product Design" as const,
  subject: "Prototype quote",
  message: "Need a bracket redesigned for machining.",
};

function messageFor(overrides: Record<string, string>): string {
  const parsed = contactSchema.safeParse({ ...valid, ...overrides });
  assert.equal(parsed.success, false);
  if (parsed.success) throw new Error("expected failure");
  return parsed.error.issues[0]?.message ?? "";
}

describe("contactSchema visitor-facing limits", () => {
  it("accepts a normal quote request", () => {
    assert.equal(contactSchema.safeParse(valid).success, true);
  });

  it("uses plain language when a field is too long", () => {
    assert.equal(
      messageFor({ message: "A".repeat(5001) }),
      "Message must be at most 5,000 characters",
    );
    assert.equal(
      messageFor({ firstName: "A".repeat(101) }),
      "First name must be at most 100 characters",
    );
    assert.equal(
      messageFor({ lastName: "A".repeat(101) }),
      "Last name must be at most 100 characters",
    );
    assert.equal(
      messageFor({ subject: "A".repeat(201) }),
      "Subject must be at most 200 characters",
    );
    assert.equal(
      messageFor({ phone: "5".repeat(41) }),
      "Phone number must be at most 40 characters",
    );
  });

  it("keeps the short-message message", () => {
    assert.equal(messageFor({ message: "too short" }), "Message must be at least 10 characters");
  });
});
