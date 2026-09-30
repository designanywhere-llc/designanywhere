import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Mail, Send, CheckCircle2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { contactSchema, SERVICE_OPTIONS, type ContactFormData } from "@shared/contact";
import { CONTACT_TO, submitContactForm } from "@/lib/submitContact";

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [mailtoFallback, setMailtoFallback] = useState<{
    href: string;
    truncated: boolean;
  } | null>(null);
  const honeyRef = useRef<HTMLInputElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mailtoFallback) return;
    fallbackRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [mailtoFallback]);

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      service: undefined,
      subject: "",
      message: "",
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    setMailtoFallback(null);

    const result = await submitContactForm(data, {
      honey: honeyRef.current?.value ?? "",
    });

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
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="bg-blue-700 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Mail className="w-6 h-6 text-blue-300" />
            <span className="text-sm font-semibold tracking-[0.2em] uppercase text-blue-300">
              Contact Us
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Get in Touch
          </h1>
          <p className="text-blue-200 text-lg max-w-xl mx-auto">
            We'd love to hear from you. Please fill out the form below to contact us directly.
          </p>
        </div>
      </div>

      {/* Form Section */}
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/">
          <button
            className="flex items-center gap-2 text-slate-500 hover:text-blue-600 text-sm font-medium mb-8 transition-colors"
            data-testid="link-back-to-home"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </Link>

        {submitted ? (
          <div
            data-testid="success-message"
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center"
          >
            <div className="flex justify-center mb-5">
              <div className="bg-green-100 p-4 rounded-full">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Message Sent!</h2>
            <p className="text-slate-500 mb-8 max-w-sm mx-auto">
              Thank you — your message has been sent. We'll get back to you soon.
            </p>
            <Link href="/">
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white border-0"
                data-testid="button-back-home-success"
              >
                Back to Home
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <p className="text-slate-600 mb-6 text-sm">
              Prefer email? Write us at{" "}
              <a
                href={`mailto:${CONTACT_TO}`}
                className="text-blue-600 hover:underline font-medium"
                data-testid="link-email-address"
              >
                {CONTACT_TO}
              </a>
            </p>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 md:p-10">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="relative space-y-6"
                  data-testid="form-contact"
                >
                  {/* Honeypot: people never see this. Bots that fill it are dropped by the form backend. */}
                  <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                    <label htmlFor="contact-honey">Company website</label>
                    <input
                      ref={honeyRef}
                      id="contact-honey"
                      name="_honey"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      defaultValue=""
                      data-testid="input-honey"
                    />
                  </div>

                  {/* Name Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-700 font-semibold">
                            First Name <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="First name"
                              data-testid="input-first-name"
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
                            Last Name <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Last name"
                              data-testid="input-last-name"
                              className="bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-400"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Email & Phone Row */}
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
                              data-testid="input-email"
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
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <Input
                                type="tel"
                                placeholder="(555) 000-0000"
                                data-testid="input-phone"
                                className="bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-400 pl-9"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Service Dropdown */}
                  <FormField
                    control={form.control}
                    name="service"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 font-semibold">
                          Service <span className="text-red-500">*</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger
                              data-testid="select-service"
                              className="bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-400"
                            >
                              <SelectValue placeholder="Select a service..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SERVICE_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt} data-testid={`option-service-${opt}`}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Subject */}
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 font-semibold">
                          Subject <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="What can we help you with?"
                            data-testid="input-subject"
                            className="bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-400"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Message */}
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 font-semibold">
                          Message <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us about your project..."
                            data-testid="input-message"
                            className="bg-slate-50 border-slate-200 focus:border-blue-400 focus:ring-blue-400 min-h-32 resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {mailtoFallback && (
                    <div
                      ref={fallbackRef}
                      role="alert"
                      data-testid="contact-mailto-fallback"
                      className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm text-slate-700 space-y-3"
                    >
                      <p>
                        We couldn't send your message from this form. Your email app has been opened with your message ready to send. Please press send there so we get it.
                      </p>
                      {mailtoFallback.truncated && (
                        <p data-testid="contact-mailto-truncated">
                          Your message was shortened so it would fit in the email. Please add anything that was cut off before you send.
                        </p>
                      )}
                      <p>If your email app didn't open, use the button below.</p>
                      <a
                        href={mailtoFallback.href}
                        data-testid="button-open-email-fallback"
                        className="inline-flex items-center justify-center rounded-md border border-blue-600 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-600 hover:text-white"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Open your email app again
                      </a>
                      <p>
                        Our email address is{" "}
                        <a
                          href={`mailto:${CONTACT_TO}`}
                          className="font-semibold text-blue-700 hover:underline"
                          data-testid="text-fallback-email"
                        >
                          {CONTACT_TO}
                        </a>
                      </p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    disabled={form.formState.isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0"
                    data-testid="button-send-message"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {form.formState.isSubmitting ? "Sending…" : "Send Message"}
                  </Button>
                </form>
              </Form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
