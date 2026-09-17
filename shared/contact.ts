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
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Please enter a valid email address").max(320),
  phone: z.string().min(7, "Please enter a valid phone number").max(40),
  service: z.enum(SERVICE_OPTIONS, { required_error: "Please select a service" }),
  subject: z.string().min(1, "Subject is required").max(200),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
});

export type ContactFormData = z.infer<typeof contactSchema>;
