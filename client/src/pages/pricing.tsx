import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Calculator, DollarSign } from "lucide-react";
import { ProjectEstimateResult } from "@/components/project-estimate-result";
import { ScheduleProject } from "@/components/schedule-project";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ESTIMATE_SERVICES,
  MAX_ESTIMATE_HOURS,
  buildEstimate,
  formatHours,
  formatUsd,
} from "@/lib/estimate";
import { estimateProject, type ProjectEstimate } from "@/lib/projectEstimate";

const DESCRIPTION_MAX = 2000;

export default function Pricing() {
  const [location] = useLocation();
  const [description, setDescription] = useState("");
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [projectEstimate, setProjectEstimate] = useState<ProjectEstimate | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [serviceHours, setServiceHours] = useState<Record<string, string>>({});

  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const scroll = () => document.getElementById(id)?.scrollIntoView();
    scroll();
    const frame = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(frame);
  }, [location]);

  const toggleService = (id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((serviceId) => serviceId !== id) : [...prev, id],
    );
  };

  const setHours = (id: string, value: string) => {
    setServiceHours((prev) => ({ ...prev, [id]: value }));
  };

  const runEstimate = () => {
    const result = estimateProject(description);
    if (result.empty) {
      setDescriptionError("Describe your project so we can suggest hours.");
      setProjectEstimate(null);
      return;
    }
    setDescriptionError(null);
    setProjectEstimate(result);
    setSelectedServices(result.selectedIds);
    setServiceHours(result.hoursById);
  };

  const estimate = buildEstimate(selectedServices, serviceHours);
  const hasResult = estimate.lines.length > 0;
  const descriptionEdited =
    projectEstimate != null && description.trim() !== projectEstimate.description;
  const showSchedule = projectEstimate != null || hasResult;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-slate-800 pt-24 pb-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <DollarSign className="w-6 h-6 text-slate-400" aria-hidden="true" />
            <span className="text-sm font-semibold tracking-[0.2em] uppercase text-slate-400">
              Pricing
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Estimate Your Project
          </h1>
          <p className="text-slate-300 text-lg max-w-xl mx-auto">
            Describe your project in your own words. You'll get a ballpark by type of work and hours. It's a starting point — your final quote comes after a free consultation.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <form
          id="project-estimator"
          className="scroll-mt-24 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-8"
          onSubmit={(event) => {
            event.preventDefault();
            runEstimate();
          }}
        >
          <h2 className="text-lg font-bold text-slate-900 mb-1">Describe your project</h2>
          <p id="project-description-help" className="text-slate-500 text-sm leading-relaxed mb-4">
            Tell us what you want made. Mention parts, size, materials, and whether you need a prototype, production help, tooling, CAD only, drawings, PDM, or a consultation.
          </p>
          <label htmlFor="project-description" className="text-sm font-semibold text-slate-700 block mb-2">
            Your project
          </label>
          <Textarea
            id="project-description"
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              if (descriptionError) setDescriptionError(null);
            }}
            maxLength={DESCRIPTION_MAX}
            rows={6}
            aria-describedby={
              descriptionError
                ? "project-description-help project-description-error"
                : "project-description-help"
            }
            aria-invalid={descriptionError ? true : undefined}
            placeholder="Example: I have a napkin sketch of a handheld kitchen gadget. I need product design, a 3D printed prototype, and design for manufacturing for about 500 plastic units."
            data-testid="textarea-project-description"
            className="bg-white border-slate-200 focus:border-slate-400 focus:ring-slate-400 min-h-36"
          />
          <div className="mt-2 flex items-start justify-between gap-4">
            <p className="text-slate-400 text-xs">
              {description.length.toLocaleString("en-US")} / {DESCRIPTION_MAX.toLocaleString("en-US")}
            </p>
          </div>
          {descriptionError ? (
            <p id="project-description-error" role="alert" className="text-red-600 text-sm mt-2">
              {descriptionError}
            </p>
          ) : null}
          {descriptionEdited ? (
            <p className="text-slate-600 text-sm mt-3">
              You edited the description. Select “See your estimate” again if you want the hours to follow the new text.
            </p>
          ) : null}
          <Button
            type="submit"
            size="lg"
            className="mt-4 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white border-0"
            data-testid="button-see-estimate"
          >
            <Calculator className="w-4 h-4 mr-2" aria-hidden="true" />
            See your estimate
          </Button>
        </form>

        {projectEstimate && !projectEstimate.empty ? <ProjectEstimateResult result={projectEstimate} /> : null}

        <div id="adjust-hours" className="scroll-mt-24 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-8 pt-8 pb-4">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Adjust by hand</h2>
            <p className="text-slate-500 text-sm">
              {projectEstimate
                ? "These hours started from your description. Change any line and your total updates. You can also turn a service off."
                : "Prefer to set the hours yourself? Choose the services you need and enter hours for each."}
            </p>
          </div>

          <div className="px-4 sm:px-8 pb-2 grid grid-cols-[1fr_auto] gap-4 items-center">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Service</span>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider w-24 text-center">Est. Hours</span>
          </div>

          <div className="divide-y divide-slate-50">
            {ESTIMATE_SERVICES.map((service) => {
              const isSelected = selectedServices.includes(service.id);
              const hourLine = estimate.lines.find((item) => item.id === service.id);
              const suggestion = projectEstimate?.lines.find((item) => item.id === service.id);
              const suggestionId = suggestion ? `hours-suggestion-${service.id}` : undefined;
              const errorId = hourLine?.error ? `hours-error-${service.id}` : undefined;
              const describedBy = [suggestionId, errorId].filter(Boolean).join(" ") || undefined;
              return (
                <div
                  key={service.id}
                  className={`px-4 sm:px-8 py-4 transition-colors ${
                    isSelected ? "bg-slate-50" : "hover:bg-slate-50/60"
                  }`}
                  data-testid={`label-service-${service.id}`}
                >
                  <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
                    <label htmlFor={`service-${service.id}`} className="flex items-start gap-3 min-w-0 cursor-pointer">
                      <Checkbox
                        id={`service-${service.id}`}
                        checked={isSelected}
                        onCheckedChange={() => toggleService(service.id)}
                        data-testid={`checkbox-service-${service.id}`}
                        className="mt-0.5 border-slate-300 data-[state=checked]:bg-slate-700 data-[state=checked]:border-slate-700 flex-shrink-0"
                      />
                      <span className="min-w-0">
                        <span className={`text-sm font-medium block ${isSelected ? "text-slate-900" : "text-slate-600"}`}>
                          {service.label}
                        </span>
                        <span className="text-slate-400 text-xs">{formatUsd(service.rate)}/hr</span>
                        {service.note ? (
                          <span className="text-slate-400 text-xs block">{service.note}</span>
                        ) : null}
                        {suggestion ? (
                          <span id={suggestionId} className="text-slate-500 text-xs block mt-1">
                            Suggested range: {formatHours(suggestion.hoursMin)}–{formatHours(suggestion.hoursMax)} hrs
                          </span>
                        ) : null}
                      </span>
                    </label>

                    <div className="w-24">
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        max={MAX_ESTIMATE_HOURS}
                        step="0.5"
                        placeholder="0"
                        value={serviceHours[service.id] || ""}
                        onChange={(event) => setHours(service.id, event.target.value)}
                        disabled={!isSelected}
                        aria-label={`Hours for ${service.label}`}
                        aria-invalid={hourLine?.error ? true : undefined}
                        aria-describedby={describedBy}
                        data-testid={`input-hours-${service.id}`}
                        className={`text-center text-sm border-slate-200 focus:border-slate-400 focus:ring-slate-400 ${
                          hourLine?.error ? "border-red-400 focus:border-red-500" : ""
                        } ${
                          !isSelected ? "bg-slate-50 text-slate-300 cursor-not-allowed" : "bg-white"
                        }`}
                      />
                    </div>
                  </div>
                  {hourLine?.error ? (
                    <span
                      id={errorId}
                      role="alert"
                      data-testid={`error-hours-${service.id}`}
                      className="block text-red-600 text-xs mt-2 pl-7"
                    >
                      {hourLine.error}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div
          className={`rounded-2xl border p-4 sm:p-8 transition-all duration-300 ${
            hasResult
              ? "bg-slate-700 border-slate-600 shadow-lg"
              : "bg-slate-50 border-slate-100"
          }`}
          data-testid="cost-estimate-panel"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className={`p-2 rounded-lg ${hasResult ? "bg-slate-600" : "bg-slate-200"}`}>
              <Calculator className={`w-5 h-5 ${hasResult ? "text-white" : "text-slate-400"}`} aria-hidden="true" />
            </div>
            <h2 className={`text-lg font-bold ${hasResult ? "text-white" : "text-slate-400"}`}>
              Cost Estimate
            </h2>
          </div>

          {hasResult ? (
            <>
              <div className="space-y-2 mb-5">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-200 text-sm font-medium">Initial Consultation & Estimate</span>
                  <span className="text-green-400 text-sm font-bold" data-testid="cost-service-consultation">Free</span>
                </div>

                {estimate.lines.map((hourLine) => (
                  <div key={hourLine.id} className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <span className="text-slate-200 text-sm font-medium">{hourLine.label}</span>
                      {hourLine.hours != null && hourLine.hours > 0 ? (
                        <span className="text-slate-400 text-xs block sm:inline sm:ml-2">
                          {formatHours(hourLine.hours)} hrs × {formatUsd(hourLine.rate)}/hr
                        </span>
                      ) : null}
                    </div>
                    <span
                      className="text-white text-sm font-bold shrink-0"
                      data-testid={`cost-service-${hourLine.id}`}
                    >
                      {hourLine.cost != null ? formatUsd(hourLine.cost) : "—"}
                    </span>
                  </div>
                ))}
              </div>

              {estimate.hasInvalid ? (
                <p className="text-amber-200 text-xs mb-4" data-testid="estimate-hours-warning">
                  Lines with invalid hours are left out of the total.
                </p>
              ) : null}

              <div className="border-t border-slate-600 pt-4 flex items-end justify-between gap-4">
                <p className="text-slate-400 text-sm">
                  {estimate.lines.length} service{estimate.lines.length > 1 ? "s" : ""} selected
                </p>
                <div className="text-right">
                  <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Estimated Total</p>
                  <p
                    className="text-3xl sm:text-4xl font-bold text-white"
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

        {showSchedule ? (
          <ScheduleProject
            description={description}
            descriptionEdited={descriptionEdited}
            fallback={projectEstimate?.fallback ?? false}
            suggestions={projectEstimate?.lines ?? []}
            estimate={estimate}
          />
        ) : null}

        <p className="text-center text-slate-400 text-xs px-4">
          This is a ballpark, not a final quote. Your price depends on the real scope, and it follows a free consultation.{" "}
          <Link href="/contact" className="text-slate-500 hover:text-slate-700 hover:underline">Contact us</Link> if you'd rather write to us directly.
        </p>
      </div>
    </div>
  );
}
