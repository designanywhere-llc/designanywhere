import { useEffect, useRef } from "react";
import { formatHours, formatUsd } from "@/lib/estimate";
import {
  projectEstimateTotals,
  type ProjectEstimate,
  type ProjectEstimateLine,
} from "@/lib/projectEstimate";

function hourSummary(line: ProjectEstimateLine): string {
  if (line.hoursMin === line.hoursMax) {
    return `About ${formatHours(line.hoursMin)} hours at ${formatUsd(line.rate)}/hr.`;
  }
  return `About ${formatHours(line.hoursMin)}–${formatHours(line.hoursMax)} hours. We'll start you at ${formatHours(line.suggestedHours)} hours (${formatUsd(line.rate)}/hr).`;
}

export function ProjectEstimateResult({ result }: { result: ProjectEstimate }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const totals = projectEstimateTotals(result.lines);
  const sameRange = totals.min === totals.max;

  useEffect(() => {
    headingRef.current?.focus();
  }, [result]);

  const summary = result.fallback
    ? `Starting ballpark ${formatUsd(totals.suggested)} for a short consultation. Your final quote follows a free consultation.`
    : sameRange
      ? `Starting ballpark ${formatUsd(totals.suggested)}. Your final quote follows a free consultation.`
      : `Starting ballpark ${formatUsd(totals.min)} to ${formatUsd(totals.max)}, beginning at ${formatUsd(totals.suggested)}. Your final quote follows a free consultation.`;

  return (
    <div
      id="project-estimate-result"
      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-8"
      data-testid="project-estimate-result"
    >
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-lg font-bold text-slate-900 mb-2 scroll-mt-24 focus:outline-none"
      >
        Your ballpark
      </h2>
      <p className="text-slate-600 text-sm leading-relaxed mb-5" aria-live="polite">
        {summary} Change the hours under Adjust by hand if the job is bigger or smaller.
      </p>

      {result.fallback ? (
        <p className="text-slate-700 text-sm leading-relaxed mb-5 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
          {result.lines[0]?.because}
        </p>
      ) : null}

      <ul className="space-y-5">
        {result.lines.map((item) => (
          <li key={item.id} className="border-t border-slate-100 pt-4 first:border-t-0 first:pt-0">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="text-sm font-semibold text-slate-900">{item.label}</h3>
              <p className="text-sm text-slate-600" data-testid={`text-project-range-${item.id}`}>
                {hourSummary(item)}
              </p>
            </div>
            {item.note ? <p className="text-slate-400 text-xs mt-1">{item.note}</p> : null}
            {result.fallback ? null : (
              <p className="text-slate-600 text-sm mt-2 leading-relaxed" data-testid={`text-project-because-${item.id}`}>
                {item.because}
              </p>
            )}
            {item.adjustments.map((adjustment) => (
              <p key={adjustment} className="text-slate-500 text-sm mt-1 leading-relaxed">
                {adjustment}
              </p>
            ))}
          </li>
        ))}
      </ul>

      <div className="border-t border-slate-100 mt-5 pt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-slate-500 text-sm">Initial consultation: Free</p>
        <div className="sm:text-right">
          <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Starting total</p>
          <p className="text-2xl font-bold text-slate-900" data-testid="text-project-starting-total">
            {formatUsd(totals.suggested)}
          </p>
          {sameRange ? null : (
            <p className="text-slate-500 text-xs mt-1">
              Range {formatUsd(totals.min)}–{formatUsd(totals.max)}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-5">
        <a
          href="#adjust-hours"
          className="inline-flex items-center justify-center rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Adjust these hours
        </a>
        <a
          href="#schedule-project"
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Schedule your project
        </a>
      </div>
    </div>
  );
}
