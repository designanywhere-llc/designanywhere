/**
 * Instant pricing-page estimate.
 * Hours outside 0–10,000 are rejected so a stray minus sign or scientific
 * notation cannot change the total. Larger scopes belong on the contact form.
 */
export const MAX_ESTIMATE_HOURS = 10_000;

export type EstimateService = {
  id: string;
  label: string;
  rate: number;
  note?: string;
};

export const ESTIMATE_SERVICES: EstimateService[] = [
  { id: "product-design", label: "Product Design", rate: 85 },
  { id: "prototype-dfm", label: "Prototype & DFM", rate: 85 },
  { id: "machine-tooling", label: "Machine & Tooling Design", rate: 100 },
  { id: "cad-3d", label: "3D Modeling & CAD Services", rate: 100 },
  { id: "pdm-plm", label: "PDM/PLM Creation", rate: 100 },
  { id: "manufacturing", label: "Manufacturing Solutions Consultation", rate: 150, note: "Travel costs not included" },
];

export type ParsedHours =
  | { ok: true; hours: number }
  | { ok: false; message: string };

export function parseEstimateHours(raw: string): ParsedHours {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: true, hours: 0 };
  if (trimmed.startsWith("-")) {
    return { ok: false, message: "Hours can't be negative." };
  }
  const hours = Number(trimmed);
  if (!Number.isFinite(hours)) {
    return { ok: false, message: "Enter a valid number of hours." };
  }
  if (hours > MAX_ESTIMATE_HOURS) {
    return { ok: false, message: "Enter at most 10,000 hours." };
  }
  return { ok: true, hours };
}

/** Round to the nearest cent so binary float noise never reaches the total. */
export function lineCost(ratePerHour: number, hours: number): number {
  return Math.round(ratePerHour * hours * 100) / 100;
}

/**
 * US dollars, locale pinned so a non-US browser cannot regroup thousands.
 * Whole dollars stay `$1,205`. Amounts with cents stay `$59.50`.
 */
export function formatUsd(amount: number): string {
  const cents = Math.round(amount * 100);
  const hasCents = cents % 100 !== 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatHours(hours: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4,
    useGrouping: false,
  }).format(hours);
}

export type EstimateLine = {
  id: string;
  label: string;
  rate: number;
  note?: string;
  hours: number | null;
  cost: number | null;
  error: string | null;
};

export type Estimate = {
  lines: EstimateLine[];
  total: number;
  anyHours: boolean;
  hasInvalid: boolean;
};

export function buildEstimate(
  selectedIds: readonly string[],
  hoursById: Readonly<Record<string, string>>,
): Estimate {
  const selected = new Set(selectedIds);
  const lines: EstimateLine[] = [];
  let total = 0;
  let anyHours = false;
  let hasInvalid = false;

  for (const service of ESTIMATE_SERVICES) {
    if (!selected.has(service.id)) continue;
    const parsed = parseEstimateHours(hoursById[service.id] ?? "");
    if (!parsed.ok) {
      hasInvalid = true;
      lines.push({
        id: service.id,
        label: service.label,
        rate: service.rate,
        note: service.note,
        hours: null,
        cost: null,
        error: parsed.message,
      });
      continue;
    }
    if (parsed.hours <= 0) {
      lines.push({
        id: service.id,
        label: service.label,
        rate: service.rate,
        note: service.note,
        hours: 0,
        cost: null,
        error: null,
      });
      continue;
    }
    const cost = lineCost(service.rate, parsed.hours);
    total = Math.round((total + cost) * 100) / 100;
    anyHours = true;
    lines.push({
      id: service.id,
      label: service.label,
      rate: service.rate,
      note: service.note,
      hours: parsed.hours,
      cost,
      error: null,
    });
  }

  return { lines, total, anyHours, hasInvalid };
}
