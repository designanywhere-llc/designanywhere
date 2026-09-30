import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { SERVICE_OPTIONS, contactSchema, type ContactFormData } from "@shared/contact";
import { formatUsd, type Estimate } from "@/lib/estimate";
import {
  fitQuoteMessage,
  quoteServicesFromEstimate,
  type ProjectEstimateLine,
} from "@/lib/projectEstimate";
import { CONTACT_TO, submitContactForm } from "@/lib/submitContact";

const scheduleSchema = contactSchema.pick({
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
});

type ScheduleValues = Pick<ContactFormData, "firstName" | "lastName" | "email" | "phone">;

function primaryService(estimate: Estimate): (typeof SERVICE_OPTIONS)[number] {
  let bestLabel = "";
  let bestCost = 0;
  for (const line of estimate.lines) {
    if (line.cost == null || line.cost <= bestCost) continue;
    bestLabel = line.label;
    bestCost = line.cost;
  }
  if ((SERVICE_OPTIONS as readonly string[]).includes(bestLabel)) {
    return bestLabel as (typeof SERVICE_OPTIONS)[number];
  }
  return "Other Mechanical Engineering Services";
}

export function ScheduleProject({
  description,
  descriptionEdited,
  fallback,
  suggestions,
  estimate,
}: {
  description: string;
  descriptionEdited: boolean;
  fallback: boolean;
  suggestions: readonly ProjectEstimateLine[];
  estimate: Estimate;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [mailtoFallback, setMailtoFallback] = useState<{
    href: string;
    truncated: boolean;
  } | null>(null);
  const honeyRef = useRef<HTMLInputElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const canSend = estimate.anyHours && !estimate.hasInvalid;

  useEffect(() => {
    if (!mailtoFallback) return;
    fallbackRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [mailtoFallback]);

  useEffect(() => {
    if (!submitted) return;
    successRef.current?.focus();
  }, [submitted]);

  const form = useForm<ScheduleValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
    },
  });

  const onSubmit = async (values: ScheduleValues) => {
    if (!canSend) return;
    setMailtoFallback(null);

    const suggestionById = new Map(suggestions.map((item) => [item.id, item]));
    const lines = [];
    for (const line of estimate.lines) {
      if (line.hours == null || line.cost == null || line.hours <= 0) continue;
      const suggestion = suggestionById.get(line.id);
      lines.push({
        label: line.label,
        hours: line.hours,
        rate: line.rate,
        cost: line.cost,
        hoursMin: suggestion?.hoursMin,
        hoursMax: suggestion?.hoursMax,
        because: suggestion?.because,
        adjustments: suggestion?.adjustments,
      });
    }

    const written = description.trim();
    const descriptionForMessage = descriptionEdited
      ? `Note: you edited the description after the hours were suggested.\n\n${written}`
      : written;
    const message = fitQuoteMessage({
      description: descriptionForMessage,
      fallback,
      lines,
      total: estimate.total,
    });

    const result = await submitContactForm(
      {
        ...values,
        service: primaryService(estimate),
        subject: "Schedule my project",
        message,
        type: "quote",
        estimate: {
          description: written,
          services: quoteServicesFromEstimate(estimate),
          total: estimate.total,
        },
      },
      { honey: honeyRef.current?.value ?? "" },
    );

    if (result.status === "sent") {
      setSubmitted(true);
      return;
    }

    setMailtoFallback({
      href: result.mailtoHref,
      truncated: result.truncated,
    });
  };

  return (
    <div
      id="schedule-project"
      className="scroll-mt-24 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-8"
    >
      <h2 className="text-lg font-bold text-slate-900 mb-1">Schedule your project</h2>
      <p className="text-slate-500 text-sm leading-relaxed mb-6">
        Send this ballpark, your description, and a way to reach you. We'll set up your free consultation and confirm the quote before any work starts.
      </p>

      {submitted ? (
        <div className="text-center py-6" data-testid="schedule-success">
          <div className="flex justify-center mb-4">
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle2 className="w-8 h-8 text-green-600" aria-hidden="true" />
            </div>
          </div>
          <h3
            ref={successRef}
            tabIndex={-1}
            className="text-xl font-bold text-slate-900 mb-2 focus:outline-none"
          >
            Request sent
          </h3>
          <p className="text-slate-600 text-sm max-w-md mx-auto">
            Thanks — we have your ballpark and your contact info. We'll be in touch to schedule your free consultation and confirm the quote.
          </p>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="relative space-y-5" data-testid="form-schedule-project">
            <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
              <label htmlFor="schedule-honey">Company website</label>
              <input
                ref={honeyRef}
                id="schedule-honey"
                name="_honey"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                defaultValue=""
                data-testid="input-schedule-honey"
              />
            </div>

            <p className="text-sm text-slate-700">
              Ballpark you're sending:{" "}
              <span className="font-semibold" data-testid="text-schedule-total">
                {estimate.anyHours ? formatUsd(estimate.total) : "—"}
              </span>
            </p>

            {estimate.hasInvalid ? (
              <p className="text-amber-700 text-sm" role="alert">
                Fix the hour entries above before you schedule. Hours need to be a number from 0 to 10,000.
              </p>
            ) : null}
            {!estimate.anyHours && !estimate.hasInvalid ? (
              <p className="text-slate-600 text-sm">
                Add hours for at least one service above, then you can schedule your project.
              </p>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-semibold">
                      First name <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Jordan"
                        autoComplete="given-name"
                        data-testid="input-schedule-first-name"
                        className="bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-400"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-semibold">
                      Last name <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Smith"
                        autoComplete="family-name"
                        data-testid="input-schedule-last-name"
                        className="bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-400"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-semibold">
                      Email <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@company.com"
                        autoComplete="email"
                        data-testid="input-schedule-email"
                        className="bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-400"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-semibold">
                      Phone <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="(555) 000-0000"
                        autoComplete="tel"
                        data-testid="input-schedule-phone"
                        className="bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-400"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {mailtoFallback ? (
              <div
                ref={fallbackRef}
                role="alert"
                data-testid="schedule-mailto-fallback"
                className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm text-slate-700 space-y-3"
              >
                <p>
                  We couldn't send your request from this form. Your email app has been opened with your estimate ready to send. Please press send there so we get it.
                </p>
                {mailtoFallback.truncated ? (
                  <p data-testid="schedule-mailto-truncated">
                    Your message was shortened so it would fit in the email. Please add anything that was cut off before you send.
                  </p>
                ) : null}
                <p>If your email app didn't open, use the button below.</p>
                <a
                  href={mailtoFallback.href}
                  data-testid="button-schedule-open-email"
                  className="inline-flex items-center justify-center rounded-md border border-blue-600 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-600 hover:text-white"
                >
                  <Mail className="w-4 h-4 mr-2" aria-hidden="true" />
                  Open your email app again
                </a>
                <p>
                  Our email address is{" "}
                  <a href={`mailto:${CONTACT_TO}`} className="font-semibold text-blue-700 hover:underline">
                    {CONTACT_TO}
                  </a>
                </p>
              </div>
            ) : null}

            <Button
              type="submit"
              size="lg"
              disabled={form.formState.isSubmitting || !canSend}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0"
              data-testid="button-schedule-project"
            >
              <Send className="w-4 h-4 mr-2" aria-hidden="true" />
              {form.formState.isSubmitting ? "Sending…" : "Schedule your project"}
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
}
