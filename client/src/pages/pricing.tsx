import { useState } from "react";
import { Link } from "wouter";
import { DollarSign, Calculator } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

const SERVICE_OPTIONS = [
  { id: "product-design", label: "Product Design", rate: 85 },
  { id: "prototype-dfm", label: "Prototype & DFM", rate: 85 },
  { id: "machine-tooling", label: "Machine & Tooling Design", rate: 100 },
  { id: "cad-3d", label: "3D Modeling & CAD Services", rate: 100 },
  { id: "pdm-plm", label: "PDM/PLM Creation", rate: 100 },
  { id: "manufacturing", label: "Manufacturing Solutions Consultation", rate: 150, note: "Travel costs not included" },
];

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

  const selectedItems = SERVICE_OPTIONS.filter((s) => selectedServices.includes(s.id));
  const totalCost = selectedItems.reduce((sum, s) => {
    const h = parseFloat(serviceHours[s.id] || "0") || 0;
    return sum + s.rate * h;
  }, 0);

  const anyHours = selectedItems.some((s) => (parseFloat(serviceHours[s.id] || "0") || 0) > 0);
  const hasResult = selectedItems.length > 0;

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
            {SERVICE_OPTIONS.map((service) => {
              const isSelected = selectedServices.includes(service.id);
              return (
                <label
                  key={service.id}
                  htmlFor={`service-${service.id}`}
                  className={`grid grid-cols-[1fr_auto] gap-4 items-center px-8 py-4 cursor-pointer transition-colors ${
                    isSelected ? "bg-slate-50" : "hover:bg-slate-50/60"
                  }`}
                  data-testid={`label-service-${service.id}`}
                >
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
                      step="0.5"
                      placeholder="0"
                      value={serviceHours[service.id] || ""}
                      onChange={(e) => setHours(service.id, e.target.value)}
                      disabled={!isSelected}
                      data-testid={`input-hours-${service.id}`}
                      className={`text-center text-sm border-slate-200 focus:border-slate-400 focus:ring-slate-400 ${
                        !isSelected ? "bg-slate-50 text-slate-300 cursor-not-allowed" : "bg-white"
                      }`}
                    />
                  </div>
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
                {selectedItems.map((s) => {
                  const h = parseFloat(serviceHours[s.id] || "0") || 0;
                  const lineCost = s.rate * h;
                  return (
                    <div key={s.id} className="flex items-center justify-between">
                      <div>
                        <span className="text-slate-200 text-sm font-medium">{s.label}</span>
                        {h > 0 && (
                          <span className="text-slate-400 text-xs ml-2">
                            {h} hrs × ${s.rate}/hr
                          </span>
                        )}
                      </div>
                      <span
                        className="text-white text-sm font-bold"
                        data-testid={`cost-service-${s.id}`}
                      >
                        {h > 0 ? `$${lineCost.toLocaleString()}` : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-slate-600 pt-4 flex items-end justify-between">
                <p className="text-slate-400 text-sm">
                  {selectedItems.length} service{selectedItems.length > 1 ? "s" : ""} selected
                </p>
                <div className="text-right">
                  <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Estimated Total</p>
                  <p
                    className="text-4xl font-bold text-white"
                    data-testid="text-estimated-cost"
                  >
                    {anyHours ? `$${totalCost.toLocaleString()}` : "—"}
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
