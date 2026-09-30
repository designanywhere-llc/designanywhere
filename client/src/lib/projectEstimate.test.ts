import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ESTIMATE_SERVICES,
  buildEstimate,
  formatHours,
  formatUsd,
  lineCost,
} from "./estimate";
import {
  estimateProject,
  fitQuoteMessage,
  formatQuoteMessage,
  projectEstimateTotals,
  quoteServicesFromEstimate,
  type ProjectEstimate,
  type ProjectEstimateLine,
} from "./projectEstimate";

const rate = (id: string) => ESTIMATE_SERVICES.find((service) => service.id === id)!.rate;

function line(result: ProjectEstimate, id: string): ProjectEstimateLine {
  const found = result.lines.find((item) => item.id === id);
  assert.ok(found, `expected ${id}`);
  return found;
}

function assertRange(
  result: ProjectEstimate,
  id: string,
  min: number,
  max: number,
  suggested: number,
): ProjectEstimateLine {
  const found = line(result, id);
  assert.equal(found.hoursMin, min, `${id} min`);
  assert.equal(found.hoursMax, max, `${id} max`);
  assert.equal(found.suggestedHours, suggested, `${id} suggested`);
  assert.equal(result.hoursById[id], formatHours(suggested));
  return found;
}

function sumCosts(pairs: Array<[string, number]>): number {
  let total = 0;
  for (const [id, hours] of pairs) {
    total = Math.round((total + lineCost(rate(id), hours)) * 100) / 100;
  }
  return total;
}

function assertUsesPublishedRates(result: ProjectEstimate): void {
  assert.deepEqual(
    result.selectedIds,
    result.lines.map((item) => item.id),
  );
  for (const item of result.lines) {
    const service = ESTIMATE_SERVICES.find((entry) => entry.id === item.id);
    assert.ok(service, item.id);
    assert.equal(item.rate, service.rate);
    assert.equal(item.label, service.label);
    assert.equal(item.note, service.note);
  }
  const totals = projectEstimateTotals(result.lines);
  assert.equal(totals.suggested, buildEstimate(result.selectedIds, result.hoursById).total);
  assert.equal(
    totals.suggested,
    sumCosts(result.lines.map((item) => [item.id, item.suggestedHours])),
  );
  assert.equal(
    totals.min,
    sumCosts(result.lines.map((item) => [item.id, item.hoursMin])),
  );
  assert.equal(
    totals.max,
    sumCosts(result.lines.map((item) => [item.id, item.hoursMax])),
  );
}

const kitchenGadget =
  "I have a napkin sketch of a handheld kitchen gadget. I need product design, a 3D printed prototype, and design for manufacturing so we can make about 500 units in plastic.";

const cadOnly =
  "We already have a design. We just need CAD only — SolidWorks models and drawings with GD&T for 12 parts. No prototype.";

const fixtureAndMold =
  "We need a custom fixture and tooling for an existing CNC machine, plus a production mold for an aluminum bracket.";

const pdmVault =
  "Please set up a SolidWorks PDM vault with workflows and a PLM database for our engineering team.";

const packagingLine =
  "Our packaging line keeps jamming. We need someone to consult on the manufacturing line and troubleshoot the equipment.";

const vagueIdea = "Hello, I have an idea I would like to talk through with you.";

const productionAssembly =
  "Design a 40-part assembly for production, including drawings, a prototype, and tooling.";

describe("estimateProject samples", () => {
  it("prices a handheld gadget with a prototype, DFM, and a 500-unit run", () => {
    const result = estimateProject(kitchenGadget);
    assert.equal(result.fallback, false);
    assert.deepEqual(result.selectedIds, ["product-design", "prototype-dfm"]);
    const design = assertRange(result, "product-design", 16, 32, 24);
    const prototype = assertRange(result, "prototype-dfm", 16, 32, 24);
    assert.equal(
      design.because,
      'We picked Product Design because you mentioned "napkin sketch", "gadget", and "product design".',
    );
    assert.deepEqual(design.adjustments, [
      'You described it as "handheld", so these hours are a little lower.',
    ]);
    assert.equal(
      prototype.because,
      'We picked Prototype & DFM because you mentioned "3D printed", "prototype", and "design for manufacturing".',
    );
    assert.deepEqual(prototype.adjustments, [
      'You mentioned "about 500 units", so we added hours for design for manufacturing.',
    ]);
    assertUsesPublishedRates(result);
    assert.equal(projectEstimateTotals(result.lines).suggested, sumCosts([
      ["product-design", 24],
      ["prototype-dfm", 24],
    ]));
  });

  it("keeps CAD only, raises hours for 12 parts, and ignores a negated prototype", () => {
    const result = estimateProject(cadOnly);
    assert.equal(result.fallback, false);
    assert.deepEqual(result.lines.map((item) => item.id), ["cad-3d"]);
    const cad = assertRange(result, "cad-3d", 18, 36, 27);
    assert.equal(
      cad.because,
      'We picked 3D Modeling & CAD Services because you mentioned "CAD only", "SolidWorks", "drawings", and "GD&T".',
    );
    assert.deepEqual(cad.adjustments, [
      'You mentioned "12 parts", so these hours are higher than a single-part job.',
    ]);
    assert.equal(result.lines.some((item) => item.id === "prototype-dfm"), false);
    assert.equal(result.lines.some((item) => item.id === "product-design"), false);
    assertUsesPublishedRates(result);
  });

  it("treats fixture, tooling, and a production mold as tooling plus a short DFM block", () => {
    const result = estimateProject(fixtureAndMold);
    assert.equal(result.fallback, false);
    assert.deepEqual(result.selectedIds, ["prototype-dfm", "machine-tooling"]);
    const dfm = assertRange(result, "prototype-dfm", 6, 12, 9);
    const tooling = assertRange(result, "machine-tooling", 18, 44, 31);
    assert.equal(
      tooling.because,
      'We picked Machine & Tooling Design because you mentioned "fixture", "tooling", and "mold".',
    );
    assert.equal(dfm.because, 'We picked Prototype & DFM because you mentioned "production".');
    assert.deepEqual(tooling.adjustments, [
      'You mentioned "aluminum", so we added a little time for metal.',
    ]);
    assert.equal(result.lines.some((item) => item.id === "cad-3d"), false);
    assertUsesPublishedRates(result);
  });

  it("sets up PDM/PLM without also charging for SolidWorks CAD", () => {
    const result = estimateProject(pdmVault);
    assert.deepEqual(result.lines.map((item) => item.id), ["pdm-plm"]);
    const pdm = assertRange(result, "pdm-plm", 16, 32, 24);
    assert.equal(
      pdm.because,
      'We picked PDM/PLM Creation because you mentioned "SolidWorks PDM", "vault", and "PLM".',
    );
    assert.deepEqual(pdm.adjustments, [
      'You mentioned "workflows", so we added time for workflows and data setup.',
    ]);
    assertUsesPublishedRates(result);
  });

  it("reads a packaging-line jam as a manufacturing consultation", () => {
    const result = estimateProject(packagingLine);
    assert.deepEqual(result.lines.map((item) => item.id), ["manufacturing"]);
    const consult = assertRange(result, "manufacturing", 8, 16, 12);
    assert.equal(
      consult.because,
      'We picked Manufacturing Solutions Consultation because you mentioned "packaging line", "consult", "manufacturing line", and "troubleshoot".',
    );
    assert.equal(result.lines.some((item) => item.id === "machine-tooling"), false);
    assert.equal(result.lines.some((item) => item.id === "prototype-dfm"), false);
    assertUsesPublishedRates(result);
  });

  it("offers a small consultation package when nothing matches", () => {
    const result = estimateProject(vagueIdea);
    assert.equal(result.empty, false);
    assert.equal(result.fallback, true);
    assert.deepEqual(result.lines.map((item) => item.id), ["manufacturing"]);
    const consult = assertRange(result, "manufacturing", 2, 4, 3);
    assert.deepEqual(consult.matchedPhrases, []);
    assert.match(consult.because, /small consultation package/);
    assert.match(consult.because, /initial consultation is free/);
    assert.match(consult.because, /final quote comes after we talk/);
    assertUsesPublishedRates(result);
    assert.equal(projectEstimateTotals(result.lines).suggested, lineCost(rate("manufacturing"), 3));
  });

  it("splits a 40-part production assembly across design, CAD, prototype, and tooling", () => {
    const result = estimateProject(productionAssembly);
    assert.deepEqual(result.selectedIds, [
      "product-design",
      "prototype-dfm",
      "machine-tooling",
      "cad-3d",
    ]);
    assertRange(result, "product-design", 24, 48, 36);
    assertRange(result, "prototype-dfm", 12, 24, 18);
    assertRange(result, "machine-tooling", 16, 40, 28);
    assertRange(result, "cad-3d", 32, 64, 48);
    assert.match(line(result, "product-design").because, /"Design a"/);
    assert.match(line(result, "cad-3d").because, /"assembly" and "drawings"/);
    assert.match(line(result, "prototype-dfm").adjustments[0] ?? "", /for production/);
    assert.match(line(result, "cad-3d").adjustments[0] ?? "", /40-part/);
    assertUsesPublishedRates(result);
    assert.equal(
      projectEstimateTotals(result.lines).suggested,
      sumCosts([
        ["product-design", 36],
        ["prototype-dfm", 18],
        ["machine-tooling", 28],
        ["cad-3d", 48],
      ]),
    );
  });
});

describe("estimateProject signals", () => {
  it("does not turn part count into one hour per part", () => {
    const huge = estimateProject("Please do product design for a 1000-part assembly");
    const forty = estimateProject("Please do product design for a 40-part assembly");
    assert.equal(line(huge, "product-design").suggestedHours, line(forty, "product-design").suggestedHours);
    assert.equal(line(huge, "cad-3d").suggestedHours, line(forty, "cad-3d").suggestedHours);
    assert.equal(line(huge, "product-design").hoursMax, 80);
    assert.ok(line(huge, "product-design").suggestedHours < 1000);
    assertUsesPublishedRates(huge);
  });

  it("caps a large-scale many-part design instead of growing without a limit", () => {
    const result = estimateProject("product design of a large-scale 40-part widget");
    const design = assertRange(result, "product-design", 50, 80, 65);
    assert.deepEqual(result.lines.map((item) => item.id), ["product-design"]);
    assert.match(design.adjustments[0] ?? "", /40-part/);
    assert.match(design.adjustments[1] ?? "", /large-scale/);
    assert.match(design.adjustments[2] ?? "", /capped these hours/);
  });

  it("drops other services when the request is CAD only, even if a gadget is mentioned", () => {
    const result = estimateProject(
      "CAD only for this gadget, with drawings for 12 parts. No prototype.",
    );
    assert.deepEqual(result.lines.map((item) => item.id), ["cad-3d"]);
    assertRange(result, "cad-3d", 18, 36, 27);
    assert.equal(line(result, "cad-3d").because.includes("gadget"), false);
  });

  it("ignores negated prototype and tooling", () => {
    const result = estimateProject(
      "Please create SolidWorks models of a bracket. No prototype and no tooling.",
    );
    assert.deepEqual(result.lines.map((item) => item.id), ["cad-3d"]);
    assertRange(result, "cad-3d", 8, 16, 12);
  });

  it("matches hyphenated prints and plural prototypes", () => {
    const result = estimateProject("We need 3D-printed prototypes of the gadget.");
    assert.deepEqual(result.selectedIds, ["product-design", "prototype-dfm"]);
    assertRange(result, "product-design", 12, 24, 18);
    const prototype = assertRange(result, "prototype-dfm", 8, 16, 12);
    assert.match(prototype.because, /3D-printed/);
    assert.match(prototype.because, /prototypes/);
  });

  it("uses the smaller consultation range for a plain consultation", () => {
    const result = estimateProject("I would like a consultation about packaging.");
    assert.deepEqual(result.lines.map((item) => item.id), ["manufacturing"]);
    assertRange(result, "manufacturing", 4, 8, 6);
    assert.equal(result.fallback, false);
  });

  it("does not treat a production line as a DFM add-on", () => {
    const result = estimateProject(
      "Our production line is down and we need someone to troubleshoot it.",
    );
    assert.deepEqual(result.lines.map((item) => item.id), ["manufacturing"]);
    assertRange(result, "manufacturing", 8, 16, 12);
  });

  it("scales a two-part CAD job by the smallest part-count band", () => {
    const result = estimateProject("Please CAD these 2 parts.");
    assertRange(result, "cad-3d", 10, 20, 15);
    assert.match(line(result, "cad-3d").adjustments[0] ?? "", /2 parts/);
  });

  it("does not guess from a blank description", () => {
    assert.equal(estimateProject("").empty, true);
    assert.equal(estimateProject("   ").empty, true);
    assert.deepEqual(estimateProject("").lines, []);
    assert.equal(estimateProject("").fallback, false);
  });
});

describe("quote message", () => {
  it("includes the description, the because line, hours, the published rate, and the total", () => {
    const result = estimateProject(kitchenGadget);
    const design = line(result, "product-design");
    const message = formatQuoteMessage({
      description: result.description,
      fallback: result.fallback,
      total: projectEstimateTotals(result.lines).suggested,
      lines: result.lines.map((item) => ({
        label: item.label,
        hours: item.suggestedHours,
        rate: item.rate,
        cost: lineCost(item.rate, item.suggestedHours),
        hoursMin: item.hoursMin,
        hoursMax: item.hoursMax,
        because: item.because,
        adjustments: item.adjustments,
      })),
    });

    assert.match(message, /Project description:/);
    assert.match(message, /napkin sketch of a handheld kitchen gadget/);
    assert.match(message, /This is a ballpark/);
    assert.match(message, /free consultation/);
    assert.match(message, /Initial consultation: Free/);
    assert.match(message, new RegExp(design.because.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(
      message,
      new RegExp(
        `Product Design: 24 hrs × ${formatUsd(design.rate).replace("$", "\\$")}/hr`,
      ),
    );
    assert.match(message, /Suggested range: 16–32 hrs/);
    assert.match(
      message,
      new RegExp(
        `Estimated total: ${formatUsd(projectEstimateTotals(result.lines).suggested).replace("$", "\\$")}`,
      ),
    );
  });

  it("says when the fallback package was used", () => {
    const result = estimateProject(vagueIdea);
    const message = formatQuoteMessage({
      description: result.description,
      fallback: true,
      total: lineCost(rate("manufacturing"), 3),
      lines: [
        {
          label: line(result, "manufacturing").label,
          hours: 3,
          rate: rate("manufacturing"),
          cost: lineCost(rate("manufacturing"), 3),
          because: line(result, "manufacturing").because,
        },
      ],
    });
    assert.match(message, /small starting package/);
    assert.match(message, /Manufacturing Solutions Consultation: 3 hrs/);
  });

  it("shortens a very long description so the message stays within 5,000 characters", () => {
    const message = fitQuoteMessage({
      description: "Bracket redesign. ".repeat(400),
      fallback: false,
      total: lineCost(rate("product-design"), 8),
      lines: [
        {
          label: "Product Design",
          hours: 8,
          rate: rate("product-design"),
          cost: lineCost(rate("product-design"), 8),
        },
      ],
    });
    assert.ok(message.length <= 5000);
    assert.match(message, /shortened to fit/);
    assert.match(message, /Estimated total:/);
  });

  it("builds the quote payload from the manual estimator lines", () => {
    const estimate = buildEstimate(["cad-3d", "product-design"], {
      "cad-3d": "1.5",
      "product-design": "0",
    });
    assert.deepEqual(quoteServicesFromEstimate(estimate), [
      {
        id: "cad-3d",
        label: "3D Modeling & CAD Services",
        hours: 1.5,
        rate: rate("cad-3d"),
        cost: lineCost(rate("cad-3d"), 1.5),
      },
    ]);
  });
});
