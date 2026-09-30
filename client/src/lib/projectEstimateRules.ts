/**
 * Plain-language project estimator rules.
 *
 * This file is the part to edit when a ballpark feels off. You do not need
 * to change the matcher (`projectEstimate.ts`) for normal tuning.
 *
 * How a description becomes hours
 * 1. Each block in `SERVICE_PHRASE_RULES` listens for phrases. Matching is
 *    case-insensitive. Hyphens and slashes count as spaces, so "3D-printed"
 *    matches "3d printed" and "PDM/PLM" matches "pdm plm".
 * 2. A phrase is ignored when it is negated ("no prototype", "without tooling",
 *    "don't need a mold").
 * 3. Longer phrases win when they overlap ("SolidWorks PDM" does not also
 *    count as plain "SolidWorks" CAD).
 * 4. If several blocks match the same service, the hours used are the highest
 *    block, not the sum. "Product design" plus "sketch" stays at the product
 *    design range.
 * 5. Signals below then add or multiply hours: part count, size, production,
 *    metal, and extra PDM setup. Part count uses the bands in `PART_COUNT`.
 *    It is not "one hour per part" — 40 parts and 1,000 parts share a band.
 * 6. "CAD only" (and the other `CAD_ONLY` phrases) keeps CAD and PDM and
 *    drops the other services.
 * 7. If nothing matches, `FALLBACK_PACKAGE` is a short consultation so the
 *    visitor still sees a number. The page also tells them the first
 *    conversation is free.
 * 8. Results are rounded to the nearest half hour, then limited by
 *    `SERVICE_HOUR_CAPS`.
 *
 * Hours here are engineering time, not machine time or the cost of parts.
 * Dollar rates are not in this file. They live once, in `ESTIMATE_SERVICES`
 * inside `estimate.ts`.
 *
 * After editing, run `npm run test:quote`. The sample descriptions in
 * `projectEstimate.test.ts` show the ranges visitors get today.
 */

export type HourRange = {
  min: number;
  max: number;
};

export type ServicePhraseRule = {
  /** Short name so you can tell blocks apart. Not shown to visitors. */
  id: string;
  /**
   * Must match an `id` in `ESTIMATE_SERVICES` (`estimate.ts`):
   * product-design, prototype-dfm, machine-tooling, cad-3d, pdm-plm, manufacturing.
   */
  serviceId: string;
  /** Words a visitor might type. Add the phrases you actually see in inquiries. */
  phrases: string[];
  /** Engineering hours when this block is the strongest match for that service. */
  hours: HourRange;
};

export const SERVICE_PHRASE_RULES: ServicePhraseRule[] = [
  {
    id: "product-design-full",
    serviceId: "product-design",
    phrases: ["product design", "industrial design", "concept design"],
    hours: { min: 20, max: 40 },
  },
  {
    id: "product-design-concept",
    serviceId: "product-design",
    phrases: [
      "napkin sketch",
      "napkin sketches",
      "sketch",
      "sketches",
      "gadget",
      "consumer product",
      "new product",
      "redesign",
    ],
    hours: { min: 12, max: 24 },
  },
  {
    id: "product-design-brief",
    serviceId: "product-design",
    phrases: ["design a", "design an"],
    hours: { min: 12, max: 24 },
  },
  {
    id: "dfm",
    serviceId: "prototype-dfm",
    phrases: ["design for manufacturing", "dfm"],
    hours: { min: 12, max: 24 },
  },
  {
    id: "prototype",
    serviceId: "prototype-dfm",
    phrases: [
      "prototypes",
      "prototype",
      "prototyping",
      "3d printed",
      "3d printing",
      "3d print",
    ],
    hours: { min: 8, max: 16 },
  },
  {
    id: "custom-machine",
    serviceId: "machine-tooling",
    phrases: [
      "custom machine",
      "custom machinery",
      "machine design",
      "design a machine",
      "design the machine",
    ],
    hours: { min: 40, max: 80 },
  },
  {
    id: "tooling",
    serviceId: "machine-tooling",
    phrases: [
      "tooling",
      "fixtures",
      "fixture",
      "jigs",
      "jig",
      "injection molding",
      "injection mold",
      "molds",
      "mold",
      "moulds",
      "mould",
      "molding",
    ],
    hours: { min: 16, max: 40 },
  },
  {
    id: "cad-assembly",
    serviceId: "cad-3d",
    phrases: ["assemblies", "assembly"],
    hours: { min: 16, max: 32 },
  },
  {
    id: "cad-drawings",
    serviceId: "cad-3d",
    phrases: ["drawing package", "drawings", "drawing", "gd&t", "gd and t", "gdt"],
    hours: { min: 12, max: 24 },
  },
  {
    id: "cad-model",
    serviceId: "cad-3d",
    phrases: [
      "cad only",
      "only cad",
      "3d cad",
      "3d modeling",
      "3d modelling",
      "3d model",
      "cad model",
      "solidworks",
      "cad",
    ],
    hours: { min: 8, max: 16 },
  },
  {
    id: "pdm",
    serviceId: "pdm-plm",
    phrases: [
      "solidworks pdm",
      "product data management",
      "product lifecycle management",
      "pdm plm",
      "pdm",
      "plm",
      "vault",
    ],
    hours: { min: 8, max: 16 },
  },
  {
    id: "line-support",
    serviceId: "manufacturing",
    phrases: [
      "packaging line",
      "production line",
      "manufacturing line",
      "assembly line",
      "troubleshooting",
      "troubleshoot",
    ],
    hours: { min: 8, max: 16 },
  },
  {
    id: "consult",
    serviceId: "manufacturing",
    phrases: [
      "manufacturing consultation",
      "manufacturing solutions",
      "consultation",
      "consult",
    ],
    hours: { min: 4, max: 8 },
  },
];

/** Part-count bands multiply design and CAD hours. They do not multiply by the count itself. */
export const PART_COUNT = {
  appliesTo: ["product-design", "cad-3d"],
  bands: [
    {
      atLeast: 40,
      multiplier: 2,
    },
    {
      atLeast: 15,
      multiplier: 1.75,
    },
    {
      atLeast: 6,
      multiplier: 1.5,
    },
    {
      atLeast: 2,
      multiplier: 1.25,
    },
  ],
  because: 'You mentioned "{phrase}", so these hours are higher than a single-part job.',
};

/** Size words scale design and CAD hours. If the text says both small and large, neither applies. */
export const SIZE_SIGNALS = {
  appliesTo: ["product-design", "cad-3d"],
  small: {
    multiplier: 0.8,
    phrases: ["handheld", "hand held", "compact", "pocket sized", "wearable"],
    because: 'You described it as "{phrase}", so these hours are a little lower.',
  },
  large: {
    multiplier: 1.25,
    phrases: ["large scale", "oversized", "floor standing"],
    because: 'You described it as "{phrase}", so these hours are a little higher.',
  },
};

/**
 * Production language adds Design-for-Manufacturing time.
 * "Production line" is a consultation, not this signal — the matcher treats
 * that phrase separately.
 */
export const PRODUCTION_SIGNAL = {
  serviceId: "prototype-dfm",
  /** "500 units" counts. A 12-part assembly does not. */
  unitAtLeast: 50,
  add: { min: 4, max: 8 },
  becauseExtra: 'You mentioned "{detail}", so we added hours for design for manufacturing.',
};

/** Metal adds a little time on the services that are already selected. It does not add a service by itself. */
export const METAL_SIGNAL = {
  phrases: [
    "stainless steel",
    "aluminum",
    "aluminium",
    "stainless",
    "steel",
    "titanium",
    "brass",
    "copper",
    "metal",
  ],
  appliesTo: ["cad-3d", "prototype-dfm", "machine-tooling"],
  add: { min: 2, max: 4 },
  because: 'You mentioned "{phrase}", so we added a little time for metal.',
};

/** Extra PDM/PLM hours when a vault or PDM/PLM phrase is already matched. */
export const PDM_EXTRAS = {
  serviceId: "pdm-plm",
  phrases: ["workflows", "workflow", "databases", "database"],
  add: { min: 8, max: 16 },
  because: 'You mentioned "{phrase}", so we added time for workflows and data setup.',
};

/**
 * "CAD only" and the phrases next to it drop product design, prototyping,
 * tooling, and consultation. CAD stays. PDM stays if they asked for it.
 */
export const CAD_ONLY = {
  phrases: [
    "cad only",
    "only cad",
    "just the cad",
    "just cad",
    "drawings only",
    "only the drawings",
    "only drawings",
    "just the drawings",
    "just drawings",
  ],
  keepServiceIds: ["cad-3d", "pdm-plm"],
  /** Used when they said "CAD only" but none of the CAD phrases matched on their own. */
  defaultHours: { min: 8, max: 16 },
};

/** Used when the description doesn't match a service. A short paid working session, after the free intro call. */
export const FALLBACK_PACKAGE = {
  serviceId: "manufacturing",
  hours: { min: 2, max: 4 },
  because:
    "We didn't see a specific type of work in what you wrote, so this is a small consultation package to get you started. Your initial consultation is free, and the final quote comes after we talk.",
};

/** Safety caps so a long description cannot turn into an unbounded hour count. */
export const SERVICE_HOUR_CAPS: Record<string, number> = {
  "product-design": 80,
  "prototype-dfm": 60,
  "machine-tooling": 120,
  "cad-3d": 80,
  "pdm-plm": 48,
  manufacturing: 24,
};

export const HOUR_CAP_NOTE =
  "We capped these hours so an open-ended description stays a ballpark you can edit.";
