import { useState } from "react";
import { Link } from "wouter";
import { DollarSign, Calculator } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  ESTIMATE_SERVICES,
  MAX_ESTIMATE_HOURS,
  buildEstimate,
  formatHours,
  formatUsd,
} from "@/lib/estimate";

export default function Pricing() {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [serviceHours, setServiceHours] = useState<Record<string, string>>({});

  const toggleService = (id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const setHours = (id: string, value: string) => {
    setServiceHours((prev) => ({ ...prev, [id]: value }));
  };

  const estimate = buildEstimate(selectedServices, serviceHours);
  const hasResult = estimate.lines.length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="bg-slate-800 pt-24 pb-10">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <DollarSign className="w-6 h-6 text-slate-400" />
            <span className="text-sm font-semibold tracking-[0.2em] uppercase text-slate-400">
              Pricing
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Design Cost Estimator
          </h1>
          <p className="text-slate-300 text-lg max-w-xl mx-auto">
            Select the services you need and enter estimated hours for each to get an instant project cost estimate.
          </p>
        </div>
      </div>

      {/* Estimator */}
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">

        {/* Services Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-8 pt-8 pb-4">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Services Needed</h2>
            <p className="text-slate-500 text-sm">Select services and enter estimated hours for each.</p>
          </div>

          {/* Column Headers */}
          <div className="px-8 pb-2 grid grid-cols-[1fr_auto] gap-4 items-center">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Service</span>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider w-24 text-center">Est. Hours</span>
          </div>

          <div className="divide-y divide-slate-50">
            {ESTIMATE_SERVICES.map((service) => {
              const isSelected = selectedServices.includes(service.id);
              const line = estimate.lines.find((item) => item.id === service.id);
              return (
                <label
                  key={service.id}
                  htmlFor={`service-${service.id}`}
                  className={`block px-8 py-4 cursor-pointer transition-colors ${
                    isSelected ? "bg-slate-50" : "hover:bg-slate-50/60"
                  }`}
                  data-testid={`label-service-${service.id}`}
                >
                  <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
                    {/* Checkbox + Name */}
                    <div className="flex items-start gap-3 min-w-0">
                      <Checkbox
                        id={`service-${service.id}`}
                        checked={isSelected}
                        onCheckedChange={() => toggleService(service.id)}
                        data-testid={`checkbox-service-${service.id}`}
                        className="mt-0.5 border-slate-300 data-[state=checked]:bg-slate-700 data-[state=checked]:border-slate-700 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <span className={`text-sm font-medium block ${isSelected ? "text-slate-900" : "text-slate-600"}`}>
                          {service.label}
                        </span>
                        {service.note && (
                          <span className="text-slate-400 text-xs">{service.note}</span>
                        )}
                      </div>
                    </div>

                    {/* Hours Input */}
                    <div className="w-24" onClick={(e) => e.preventDefault()}>
                      <Input
                        type="number"
                        min="0"
                        max={MAX_ESTIMATE_HOURS}
                        step="0.5"
                        placeholder="0"
                        value={serviceHours[service.id] || ""}
                        onChange={(e) => setHours(service.id, e.target.value)}
                        disabled={!isSelected}
                        aria-invalid={line?.error ? true : undefined}
                        aria-describedby={line?.error ? `hours-error-${service.id}` : undefined}
                        data-testid={`input-hours-${service.id}`}
                        className={`text-center text-sm border-slate-200 focus:border-slate-400 focus:ring-slate-400 ${
                          line?.error ? "border-red-400 focus:border-red-500" : ""
                        } ${
                          !isSelected ? "bg-slate-50 text-slate-300 cursor-not-allowed" : "bg-white"
                        }`}
                      />
                    </div>
                  </div>
                  {line?.error && (
                    <span
                      id={`hours-error-${service.id}`}
                      role="alert"
                      data-testid={`error-hours-${service.id}`}
                      className="block text-red-600 text-xs mt-2 pl-7"
                    >
                      {line.error}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>

        {/* Cost Estimate Result */}
        <div
          className={`rounded-2xl border p-8 transition-all duration-300 ${
            hasResult
              ? "bg-slate-700 border-slate-600 shadow-lg"
              : "bg-slate-50 border-slate-100"
          }`}
          data-testid="cost-estimate-panel"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className={`p-2 rounded-lg ${hasResult ? "bg-slate-600" : "bg-slate-200"}`}>
              <Calculator className={`w-5 h-5 ${hasResult ? "text-white" : "text-slate-400"}`} />
            </div>
            <h2 className={`text-lg font-bold ${hasResult ? "text-white" : "text-slate-400"}`}>
              Cost Estimate
            </h2>
          </div>

          {hasResult ? (
            <>
              <div className="space-y-2 mb-5">
                {/* Initial Consultation — always first, always free */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-200 text-sm font-medium">Initial Consultation & Estimate</span>
                  <span className="text-green-400 text-sm font-bold" data-testid="cost-service-consultation">Free</span>
                </div>

                {/* Selected services */}
                {estimate.lines.map((line) => (
                    <div key={line.id} className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <span className="text-slate-200 text-sm font-medium">{line.label}</span>
                        {line.hours != null && line.hours > 0 && (
                          <span className="text-slate-400 text-xs ml-2">
                            {formatHours(line.hours)} hrs × {formatUsd(line.rate)}/hr
                          </span>
                        )}
                      </div>
                      <span
                        className="text-white text-sm font-bold shrink-0"
                        data-testid={`cost-service-${line.id}`}
                      >
                        {line.cost != null ? formatUsd(line.cost) : "—"}
                      </span>
                    </div>
                ))}
              </div>

              {estimate.hasInvalid && (
                <p className="text-amber-200 text-xs mb-4" data-testid="estimate-hours-warning">
                  Lines with invalid hours are left out of the total.
                </p>
              )}

              <div className="border-t border-slate-600 pt-4 flex items-end justify-between gap-4">
                <p className="text-slate-400 text-sm">
                  {estimate.lines.length} service{estimate.lines.length > 1 ? "s" : ""} selected
                </p>
                <div className="text-right">
                  <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Estimated Total</p>
                  <p
                    className="text-4xl font-bold text-white"
                    data-testid="text-estimated-cost"
                  >
                    {estimate.anyHours ? formatUsd(estimate.total) : "—"}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-slate-400 text-sm">
              Select at least one service above to see your cost estimate.
            </p>
          )}
        </div>

        <p className="text-center text-slate-400 text-xs px-4">
          This is an estimate only. Final pricing is determined based on project scope and complexity.{" "}
          <Link href="/contact" className="text-slate-500 hover:text-slate-700 hover:underline">Contact us</Link> for a detailed quote.
        </p>
      </div>
    </div>
  );
}
