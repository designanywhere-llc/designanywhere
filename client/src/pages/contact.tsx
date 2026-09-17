import { useState } from "react";
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

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
    setSubmitError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const payload = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null;

      if (!res.ok) {
        setSubmitError(
          payload?.error ?? "Failed to send message. Please try again.",
        );
        return;
      }

      setSubmitted(true);
    } catch {
      setSubmitError("Network error. Please try again or email us directly.");
    }
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
                href="mailto:engineering@designanywhere.org"
                className="text-blue-600 hover:underline font-medium"
                data-testid="link-email-address"
              >
                engineering@designanywhere.org
              </a>
            </p>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 md:p-10">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                  data-testid="form-contact"
                >
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
                              placeholder="Jordan"
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
                              placeholder="Smith"
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
                              placeholder="jordan@company.com"
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

                  {submitError && (
                    <p
                      role="alert"
                      data-testid="contact-submit-error"
                      className="text-sm text-red-600"
                    >
                      {submitError} If this keeps happening, email{" "}
                      <a
                        href="mailto:engineering@designanywhere.org"
                        className="underline font-medium"
                      >
                        engineering@designanywhere.org
                      </a>
                    </p>
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
