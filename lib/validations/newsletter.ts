import { z } from "zod";

export const newsletterSchema = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email address.").max(254),
  // Honeypot: real visitors never fill this in.
  company: z.string().max(200).optional(),
  source: z.string().max(40).optional(),
});

export type NewsletterInput = z.infer<typeof newsletterSchema>;
