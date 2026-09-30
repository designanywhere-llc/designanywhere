/**
 * Turns a free-text project description into per-service hour ranges.
 * Phrase lists and hour numbers live in `projectEstimateRules.ts`.
 * Dollar rates and the total come from `estimate.ts` — do not copy them here.
 */

import {
  ESTIMATE_SERVICES,
  buildEstimate,
  formatHours,
  formatUsd,
  type Estimate,
} from "./estimate";
import {
  CAD_ONLY,
  FALLBACK_PACKAGE,
  HOUR_CAP_NOTE,
  METAL_SIGNAL,
  PART_COUNT,
  PDM_EXTRAS,
  PRODUCTION_SIGNAL,
  SERVICE_HOUR_CAPS,
  SERVICE_PHRASE_RULES,
  SIZE_SIGNALS,
  type HourRange,
} from "./projectEstimateRules";

export type ProjectEstimateLine = {
  id: string;
  label: string;
  rate: number;
  note?: string;
  hoursMin: number;
  hoursMax: number;
  suggestedHours: number;
  matchedPhrases: string[];
  because: string;
  adjustments: string[];
};

export type ProjectEstimate = {
  /** Trimmed description that was estimated. */
  description: string;
  empty: boolean;
  fallback: boolean;
  lines: ProjectEstimateLine[];
  /** Service ids to check in the manual estimator, in published rate order. */
  selectedIds: string[];
  /** Suggested hours, formatted for the manual hour inputs. */
  hoursById: Record<string, string>;
};

type Occurrence = {
  ruleIndex: number;
  phrase: string;
  start: number;
  end: number;
};

type Draft = {
  id: string;
  hours: HourRange;
  phrases: string[];
  adjustments: string[];
  capped: boolean;
};

const servicesById = new Map(ESTIMATE_SERVICES.map((service) => [service.id, service]));

function assertKnownService(id: string, where: string): void {
  if (!servicesById.has(id)) {
    throw new Error(
      `Estimator rules: unknown service "${id}" in ${where}. Use an id from ESTIMATE_SERVICES in estimate.ts.`,
    );
  }
}

for (const rule of SERVICE_PHRASE_RULES) {
  assertKnownService(rule.serviceId, `phrase rule ${rule.id}`);
}
assertKnownService(PRODUCTION_SIGNAL.serviceId, "PRODUCTION_SIGNAL");
assertKnownService(PDM_EXTRAS.serviceId, "PDM_EXTRAS");
assertKnownService(FALLBACK_PACKAGE.serviceId, "FALLBACK_PACKAGE");
for (const id of CAD_ONLY.keepServiceIds) assertKnownService(id, "CAD_ONLY.keepServiceIds");
for (const id of PART_COUNT.appliesTo) assertKnownService(id, "PART_COUNT.appliesTo");
for (const id of SIZE_SIGNALS.appliesTo) assertKnownService(id, "SIZE_SIGNALS.appliesTo");
for (const id of METAL_SIGNAL.appliesTo) assertKnownService(id, "METAL_SIGNAL.appliesTo");

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const patternCache = new Map<string, RegExp>();

function phraseRegex(phrase: string): RegExp {
  let pattern = patternCache.get(phrase);
  if (!pattern) {
    const words = phrase
      .toLowerCase()
      .split(/[\s\-/]+/)
      .filter(Boolean)
      .map(escapeRegex);
    const body = words.join("[\\s\\-/]+");
    pattern = new RegExp(`(?<![a-z0-9])${body}(?![a-z0-9])`, "gi");
    patternCache.set(phrase, pattern);
  }
  pattern.lastIndex = 0;
  return pattern;
}

const NEGATION =
  /(?:\b(?:no|not|without|never|don['’]t|dont|do not)\b(?:\s+\w+){0,4}\s*)$/i;

function isNegated(text: string, start: number): boolean {
  const before = text.slice(Math.max(0, start - 64), start);
  return NEGATION.test(before);
}

function eachMatch(pattern: RegExp, text: string, visit: (match: RegExpExecArray) => boolean | void): void {
  pattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const stop = visit(match);
    if (match[0].length === 0) pattern.lastIndex += 1;
    if (stop) return;
  }
}

function findPhrase(text: string, phrase: string): Occurrence | null {
  const pattern = phraseRegex(phrase);
  let found: Occurrence | null = null;
  eachMatch(pattern, text, (match) => {
    const start = match.index ?? 0;
    if (isNegated(text, start)) return;
    found = {
      ruleIndex: -1,
      phrase: match[0],
      start,
      end: start + match[0].length,
    };
    return true;
  });
  return found;
}

function findAllOccurrences(text: string): Occurrence[] {
  const found: Occurrence[] = [];
  SERVICE_PHRASE_RULES.forEach((rule, ruleIndex) => {
    for (const phrase of rule.phrases) {
      const pattern = phraseRegex(phrase);
      eachMatch(pattern, text, (match) => {
        const start = match.index ?? 0;
        if (isNegated(text, start)) return;
        found.push({
          ruleIndex,
          phrase: match[0],
          start,
          end: start + match[0].length,
        });
      });
    }
  });
  found.sort((a, b) => b.phrase.length - a.phrase.length || a.start - b.start);
  const accepted: Occurrence[] = [];
  for (const occurrence of found) {
    const overlaps = accepted.some(
      (kept) => occurrence.start < kept.end && occurrence.end > kept.start,
    );
    if (!overlaps) accepted.push(occurrence);
  }
  accepted.sort((a, b) => a.start - b.start);
  return accepted;
}

function wider(a: HourRange, b: HourRange): HourRange {
  if (a.max !== b.max) return a.max > b.max ? a : b;
  return a.min >= b.min ? a : b;
}

function addRange(a: HourRange, b: HourRange): HourRange {
  return { min: a.min + b.min, max: a.max + b.max };
}

function scaleRange(range: HourRange, multiplier: number): HourRange {
  return { min: range.min * multiplier, max: range.max * multiplier };
}

function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}

function uniquePhrases(phrases: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const phrase of phrases) {
    const key = phrase.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(phrase);
  }
  return unique;
}

function joinAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function becauseYouMentioned(label: string, phrases: string[]): string {
  const quoted = phrases.map((phrase) => `"${phrase}"`);
  return `We picked ${label} because you mentioned ${joinAnd(quoted)}.`;
}

function partCountMatch(text: string): { count: number; phrase: string } | null {
  const pattern = /\b(\d{1,5})\b\s*-?\s*(parts?|components?)\b/gi;
  let best: { count: number; phrase: string } | null = null;
  eachMatch(pattern, text, (match) => {
    const count = Number(match[1]);
    if (!Number.isFinite(count) || count < 1) return;
    if (!best || count > best.count) best = { count, phrase: match[0] };
  });
  return best;
}

function unitCount(text: string): number | null {
  const pattern = /\b(\d{1,7})\b\s*(units?|pcs)\b/gi;
  let best: number | null = null;
  eachMatch(pattern, text, (match) => {
    const count = Number(match[1]);
    if (!Number.isFinite(count)) return;
    if (best === null || count > best) best = count;
  });
  return best;
}

function productionDetail(text: string): string | null {
  const units = unitCount(text);
  if (units !== null && units >= PRODUCTION_SIGNAL.unitAtLeast) {
    return `about ${units} units`;
  }
  const specific = [
    "mass production",
    "production run",
    "for production",
    "into production",
    "production ready",
  ];
  for (const phrase of specific) {
    const found = findPhrase(text, phrase);
    if (found) return found.phrase;
  }
  if (findPhrase(text, "production") && !findPhrase(text, "production line")) {
    return "production";
  }
  return null;
}

function firstMatchingPhrase(text: string, phrases: string[]): string | null {
  let best: Occurrence | null = null;
  for (const phrase of phrases) {
    const found = findPhrase(text, phrase);
    if (!found) continue;
    if (!best || found.phrase.length > best.phrase.length || (found.phrase.length === best.phrase.length && found.start < best.start)) {
      best = found;
    }
  }
  return best?.phrase ?? null;
}

function cadOnlyPhrase(text: string): string | null {
  return firstMatchingPhrase(text, CAD_ONLY.phrases);
}

function emptyEstimate(description: string): ProjectEstimate {
  return {
    description,
    empty: true,
    fallback: false,
    lines: [],
    selectedIds: [],
    hoursById: {},
  };
}

function finalizeDraft(draft: Draft): { hoursMin: number; hoursMax: number; suggestedHours: number } {
  const cap = SERVICE_HOUR_CAPS[draft.id] ?? Number.POSITIVE_INFINITY;
  let min = roundToHalf(draft.hours.min);
  let max = roundToHalf(draft.hours.max);
  if (max < min) max = min;
  if (min < 0.5) min = 0.5;
  if (max < min) max = min;
  if (max > cap) {
    draft.capped = true;
    max = cap;
  }
  if (min > max) min = max;
  let suggested = roundToHalf((min + max) / 2);
  if (suggested < min) suggested = min;
  if (suggested > max) suggested = max;
  return { hoursMin: min, hoursMax: max, suggestedHours: suggested };
}

/**
 * Read a project description and return hour ranges per service.
 * An empty description does not guess. Unrecognized text uses the fallback package.
 */
export function estimateProject(rawDescription: string): ProjectEstimate {
  const description = rawDescription.trim();
  if (!description) return emptyEstimate("");

  const accepted = findAllOccurrences(description);
  const drafts = new Map<string, Draft>();

  for (const occurrence of accepted) {
    const rule = SERVICE_PHRASE_RULES[occurrence.ruleIndex];
    if (!rule) continue;
    const existing = drafts.get(rule.serviceId);
    if (!existing) {
      drafts.set(rule.serviceId, {
        id: rule.serviceId,
        hours: { ...rule.hours },
        phrases: [occurrence.phrase],
        adjustments: [],
        capped: false,
      });
      continue;
    }
    existing.hours = wider(existing.hours, rule.hours);
    existing.phrases.push(occurrence.phrase);
  }

  const onlyCad = cadOnlyPhrase(description);
  if (onlyCad) {
    const removeIds: string[] = [];
    drafts.forEach((_draft, id) => {
      if (!CAD_ONLY.keepServiceIds.includes(id)) removeIds.push(id);
    });
    for (const id of removeIds) drafts.delete(id);
    if (!drafts.has("cad-3d")) {
      drafts.set("cad-3d", {
        id: "cad-3d",
        hours: { ...CAD_ONLY.defaultHours },
        phrases: [onlyCad],
        adjustments: [],
        capped: false,
      });
    }
  }

  if (!onlyCad) {
    const detail = productionDetail(description);
    if (detail) {
      const existing = drafts.get(PRODUCTION_SIGNAL.serviceId);
      if (existing) {
        existing.hours = addRange(existing.hours, PRODUCTION_SIGNAL.add);
        existing.adjustments.push(fillTemplate(PRODUCTION_SIGNAL.becauseExtra, { detail }));
      } else {
        drafts.set(PRODUCTION_SIGNAL.serviceId, {
          id: PRODUCTION_SIGNAL.serviceId,
          hours: { ...PRODUCTION_SIGNAL.add },
          phrases: [detail],
          adjustments: [],
          capped: false,
        });
      }
    }
  }

  const metalPhrase = firstMatchingPhrase(description, METAL_SIGNAL.phrases);
  if (metalPhrase) {
    const note = fillTemplate(METAL_SIGNAL.because, { phrase: metalPhrase });
    for (const id of METAL_SIGNAL.appliesTo) {
      const draft = drafts.get(id);
      if (!draft) continue;
      draft.hours = addRange(draft.hours, METAL_SIGNAL.add);
      draft.adjustments.push(note);
    }
  }

  const pdm = drafts.get(PDM_EXTRAS.serviceId);
  if (pdm) {
    const extraPhrase = firstMatchingPhrase(description, PDM_EXTRAS.phrases);
    if (extraPhrase) {
      pdm.hours = addRange(pdm.hours, PDM_EXTRAS.add);
      pdm.adjustments.push(fillTemplate(PDM_EXTRAS.because, { phrase: extraPhrase }));
    }
  }

  const parts = partCountMatch(description);
  if (parts) {
    const band = PART_COUNT.bands.find((item) => parts.count >= item.atLeast);
    if (band && band.multiplier !== 1) {
      const note = fillTemplate(PART_COUNT.because, { phrase: parts.phrase });
      for (const id of PART_COUNT.appliesTo) {
        const draft = drafts.get(id);
        if (!draft) continue;
        draft.hours = scaleRange(draft.hours, band.multiplier);
        draft.adjustments.push(note);
      }
    }
  }

  const smallPhrase = firstMatchingPhrase(description, SIZE_SIGNALS.small.phrases);
  const largePhrase = firstMatchingPhrase(description, SIZE_SIGNALS.large.phrases);
  const size = smallPhrase && largePhrase ? null : smallPhrase ? SIZE_SIGNALS.small : largePhrase ? SIZE_SIGNALS.large : null;
  const sizePhrase = smallPhrase && !largePhrase ? smallPhrase : largePhrase && !smallPhrase ? largePhrase : null;
  if (size && sizePhrase && size.multiplier !== 1) {
    const note = fillTemplate(size.because, { phrase: sizePhrase });
    for (const id of SIZE_SIGNALS.appliesTo) {
      const draft = drafts.get(id);
      if (!draft) continue;
      draft.hours = scaleRange(draft.hours, size.multiplier);
      draft.adjustments.push(note);
    }
  }

  let fallback = false;
  if (drafts.size === 0) {
    fallback = true;
    drafts.set(FALLBACK_PACKAGE.serviceId, {
      id: FALLBACK_PACKAGE.serviceId,
      hours: { ...FALLBACK_PACKAGE.hours },
      phrases: [],
      adjustments: [],
      capped: false,
    });
  }

  const lines: ProjectEstimateLine[] = [];
  for (const service of ESTIMATE_SERVICES) {
    const draft = drafts.get(service.id);
    if (!draft) continue;
    const finalized = finalizeDraft(draft);
    if (draft.capped) draft.adjustments.push(HOUR_CAP_NOTE);
    const phrases = uniquePhrases(draft.phrases);
    const because = fallback
      ? FALLBACK_PACKAGE.because
      : becauseYouMentioned(service.label, phrases);
    lines.push({
      id: service.id,
      label: service.label,
      rate: service.rate,
      note: service.note,
      hoursMin: finalized.hoursMin,
      hoursMax: finalized.hoursMax,
      suggestedHours: finalized.suggestedHours,
      matchedPhrases: phrases,
      because,
      adjustments: draft.adjustments,
    });
  }

  const hoursById: Record<string, string> = {};
  for (const line of lines) {
    hoursById[line.id] = formatHours(line.suggestedHours);
  }

  return {
    description,
    empty: false,
    fallback,
    lines,
    selectedIds: lines.map((line) => line.id),
    hoursById,
  };
}

/** Min, max, and suggested totals using the same money math as the manual estimator. */
export function projectEstimateTotals(lines: readonly ProjectEstimateLine[]): {
  min: number;
  max: number;
  suggested: number;
} {
  if (lines.length === 0) return { min: 0, max: 0, suggested: 0 };
  const ids = lines.map((line) => line.id);
  const totalFor = (pick: (line: ProjectEstimateLine) => number) =>
    buildEstimate(
      ids,
      Object.fromEntries(lines.map((line) => [line.id, formatHours(pick(line))])),
    ).total;
  return {
    min: totalFor((line) => line.hoursMin),
    max: totalFor((line) => line.hoursMax),
    suggested: totalFor((line) => line.suggestedHours),
  };
}

export type QuoteMessageLine = {
  label: string;
  hours: number;
  rate: number;
  cost: number;
  hoursMin?: number;
  hoursMax?: number;
  because?: string;
  adjustments?: string[];
};

/** Plain-text estimate for the email body, so the lead is readable without the JSON. */
export function formatQuoteMessage(input: {
  description: string;
  fallback: boolean;
  lines: readonly QuoteMessageLine[];
  total: number;
}): string {
  const description = input.description.trim();
  const blocks = input.lines.map((line) => {
    const rows = [
      `${line.label}: ${formatHours(line.hours)} hrs × ${formatUsd(line.rate)}/hr = ${formatUsd(line.cost)}`,
    ];
    if (
      line.hoursMin != null &&
      line.hoursMax != null &&
      (line.hoursMin !== line.hours || line.hoursMax !== line.hours)
    ) {
      rows.push(
        `Suggested range: ${formatHours(line.hoursMin)}–${formatHours(line.hoursMax)} hrs.`,
      );
    }
    if (line.because) rows.push(line.because);
    for (const adjustment of line.adjustments ?? []) rows.push(adjustment);
    return rows.join("\n");
  });

  const intro = input.fallback
    ? "We didn't match a specific type of work, so this is a small starting package. This is a ballpark. Your final quote follows a free consultation."
    : "This is a ballpark. Your final quote follows a free consultation.";

  return [
    "Project description:",
    description || "(No description was entered. Hours were set on the pricing page.)",
    "",
    intro,
    "",
    ...blocks.flatMap((block) => [block, ""]),
    `Estimated total: ${formatUsd(input.total)}`,
    "Initial consultation: Free",
  ]
    .join("\n")
    .trim();
}

/** Keep the contact message inside the existing 5,000 character limit. */
export function fitQuoteMessage(input: {
  description: string;
  fallback: boolean;
  lines: readonly QuoteMessageLine[];
  total: number;
  maxLength?: number;
}): string {
  const maxLength = input.maxLength ?? 5000;
  let description = input.description.trim();
  let message = formatQuoteMessage({ ...input, description });
  if (message.length <= maxLength) return message;

  const note = "\n\n[The project description was shortened to fit the message.]";
  let lo = 0;
  let hi = description.length;
  let best = 0;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const candidate = formatQuoteMessage({
      ...input,
      description: `${description.slice(0, mid).trimEnd()}${note}`,
    });
    if (candidate.length <= maxLength) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  message = formatQuoteMessage({
    ...input,
    description: `${description.slice(0, best).trimEnd()}${note}`,
  });
  if (message.length <= maxLength) return message;
  return message.slice(0, maxLength);
}

export function quoteServicesFromEstimate(estimate: Estimate): Array<{
  id: string;
  label: string;
  hours: number;
  rate: number;
  cost: number;
}> {
  const services: Array<{
    id: string;
    label: string;
    hours: number;
    rate: number;
    cost: number;
  }> = [];
  for (const line of estimate.lines) {
    if (line.hours == null || line.cost == null || line.hours <= 0) continue;
    services.push({
      id: line.id,
      label: line.label,
      hours: line.hours,
      rate: line.rate,
      cost: line.cost,
    });
  }
  return services;
}
