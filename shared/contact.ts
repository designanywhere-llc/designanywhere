import { z } from "zod";

export const SERVICE_OPTIONS = [
  "Product Design",
  "Prototype & DFM",
  "Machine & Tooling Design",
  "3D Modeling & CAD Services",
  "PDM/PLM Creation",
  "Manufacturing Solutions Consultation",
  "Other Mechanical Engineering Services",
] as const;

export const contactSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100, "First name must be at most 100 characters"),
  lastName: z.string().min(1, "Last name is required").max(100, "Last name must be at most 100 characters"),
  email: z.string().email("Please enter a valid email address").max(320, "Email must be at most 320 characters"),
  phone: z.string().min(7, "Please enter a valid phone number").max(40, "Phone number must be at most 40 characters"),
  service: z.enum(SERVICE_OPTIONS, { required_error: "Please select a service" }),
  subject: z.string().min(1, "Subject is required").max(200, "Subject must be at most 200 characters"),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000, "Message must be at most 5,000 characters"),
});

export type ContactFormData = z.infer<typeof contactSchema>;
