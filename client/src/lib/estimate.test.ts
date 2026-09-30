import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ESTIMATE_SERVICES,
  buildEstimate,
  formatHours,
  formatUsd,
  lineCost,
  parseEstimateHours,
} from "./estimate";

const rate = (id: string) => ESTIMATE_SERVICES.find((s) => s.id === id)!.rate;

describe("parseEstimateHours", () => {
  it("treats blank input as zero hours", () => {
    assert.deepEqual(parseEstimateHours(""), { ok: true, hours: 0 });
    assert.deepEqual(parseEstimateHours("   "), { ok: true, hours: 0 });
  });

  it("accepts ordinary and fractional hours up to the cap", () => {
    assert.deepEqual(parseEstimateHours("10"), { ok: true, hours: 10 });
    assert.deepEqual(parseEstimateHours("0.5"), { ok: true, hours: 0.5 });
    assert.deepEqual(parseEstimateHours("0.7"), { ok: true, hours: 0.7 });
    assert.deepEqual(parseEstimateHours("1.1"), { ok: true, hours: 1.1 });
    assert.deepEqual(parseEstimateHours("0.001"), { ok: true, hours: 0.001 });
    assert.deepEqual(parseEstimateHours("10000"), { ok: true, hours: 10000 });
    assert.deepEqual(parseEstimateHours("0"), { ok: true, hours: 0 });
  });

  it("rejects negative hours instead of subtracting them from the total", () => {
    assert.deepEqual(parseEstimateHours("-4"), {
      ok: false,
      message: "Hours can't be negative.",
    });
    assert.deepEqual(parseEstimateHours("-0.5"), {
      ok: false,
      message: "Hours can't be negative.",
    });
  });

  it("rejects values above 10,000 hours, including scientific notation", () => {
    assert.deepEqual(parseEstimateHours("10000.01"), {
      ok: false,
      message: "Enter at most 10,000 hours.",
    });
    assert.deepEqual(parseEstimateHours("1e21"), {
      ok: false,
      message: "Enter at most 10,000 hours.",
    });
    assert.deepEqual(parseEstimateHours("1e308"), {
      ok: false,
      message: "Enter at most 10,000 hours.",
    });
  });

  it("rejects non-numeric input", () => {
    assert.deepEqual(parseEstimateHours("abc"), {
      ok: false,
      message: "Enter a valid number of hours.",
    });
    assert.deepEqual(parseEstimateHours("Infinity"), {
      ok: false,
      message: "Enter a valid number of hours.",
    });
  });
});

describe("money formatting", () => {
  it("rounds binary-float products to cents", () => {
    assert.equal(lineCost(85, 0.7), 59.5);
    assert.equal(formatUsd(lineCost(85, 0.7)), "$59.50");
    assert.equal(formatUsd(lineCost(85, 1.1)), "$93.50");
    assert.equal(lineCost(rate("product-design"), 10), 850);
    assert.equal(lineCost(rate("machine-tooling"), 2.5), 250);
    assert.equal(lineCost(rate("manufacturing"), 0.7), 105);
  });

  it("keeps whole dollars compact and pins the locale to en-US", () => {
    assert.equal(formatUsd(1205), "$1,205");
    assert.equal(formatUsd(0.15), "$0.15");
    assert.equal(formatUsd(110), "$110");
    assert.equal(formatHours(0.7), "0.7");
    assert.equal(formatHours(2.5), "2.5");
    assert.equal(formatHours(10), "10");
  });
});

describe("buildEstimate", () => {
  it("sums the published rates for a normal project", () => {
    const estimate = buildEstimate(
      ["product-design", "machine-tooling", "manufacturing"],
      { "product-design": "10", "machine-tooling": "2.5", manufacturing: "0.7" },
    );
    assert.equal(estimate.total, 1205);
    assert.equal(estimate.anyHours, true);
    assert.equal(estimate.hasInvalid, false);
    assert.deepEqual(
      estimate.lines.map((line) => [line.id, line.cost]),
      [
        ["product-design", 850],
        ["machine-tooling", 250],
        ["manufacturing", 105],
      ],
    );
  });

  it("leaves negative hours out of the total", () => {
    const estimate = buildEstimate(
      ["product-design", "machine-tooling"],
      { "product-design": "-4", "machine-tooling": "10" },
    );
    assert.equal(estimate.total, 1000);
    assert.equal(estimate.hasInvalid, true);
    const product = estimate.lines.find((line) => line.id === "product-design")!;
    assert.equal(product.cost, null);
    assert.equal(product.error, "Hours can't be negative.");
    assert.equal(estimate.lines.find((line) => line.id === "machine-tooling")!.cost, 1000);
  });

  it("does not turn a huge hour entry into a dollar amount", () => {
    const estimate = buildEstimate(["manufacturing"], { manufacturing: "1e21" });
    assert.equal(estimate.total, 0);
    assert.equal(estimate.anyHours, false);
    assert.equal(estimate.hasInvalid, true);
    assert.equal(estimate.lines[0].cost, null);
    assert.equal(estimate.lines[0].error, "Enter at most 10,000 hours.");
  });

  it("shows a dash-equivalent empty cost when hours are blank or zero", () => {
    const estimate = buildEstimate(
      ["product-design", "cad-3d"],
      { "product-design": "", "cad-3d": "0" },
    );
    assert.equal(estimate.total, 0);
    assert.equal(estimate.anyHours, false);
    assert.equal(estimate.hasInvalid, false);
    assert.ok(estimate.lines.every((line) => line.cost === null && line.error === null));
  });

  it("ignores hours for services that are not selected", () => {
    const estimate = buildEstimate(["machine-tooling"], {
      "product-design": "-4",
      "machine-tooling": "1.1",
    });
    assert.equal(estimate.total, 110);
    assert.equal(estimate.hasInvalid, false);
    assert.equal(estimate.lines.length, 1);
  });

  it("prices a tenth of an hour without dropping the cent", () => {
    const estimate = buildEstimate(["manufacturing"], { manufacturing: "0.001" });
    assert.equal(estimate.total, 0.15);
    assert.equal(formatUsd(estimate.total), "$0.15");
  });
});
