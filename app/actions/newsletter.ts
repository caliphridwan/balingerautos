"use server";

import { prisma } from "@/lib/prisma";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { newsletterSchema } from "@/lib/validations/newsletter";

export interface NewsletterState {
  status: "idle" | "success" | "error";
  message: string;
}

export async function subscribeToNewsletter(
  _prev: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const parsed = newsletterSchema.safeParse({
    email: formData.get("email"),
    company: formData.get("company") ?? "",
    source: formData.get("source") ?? undefined,
  });

  if (!parsed.success) {
    const message = parsed.error.flatten().fieldErrors.email?.[0] ?? "Please check your email address.";
    return { status: "error", message };
  }

  // Bots that fill the honeypot get a polite success and nothing is stored.
  if (parsed.data.company) return { status: "success", message: "Thank you — you're on the list." };

  const limit = rateLimit(`newsletter:${clientIp()}`, 5, 10 * 60_000);
  if (!limit.ok) {
    return { status: "error", message: "Too many attempts. Please try again in a few minutes." };
  }

  try {
    await prisma.newsletterSubscriber.upsert({
      where: { email: parsed.data.email },
      update: { isSubscribed: true, unsubscribedAt: null },
      create: { email: parsed.data.email, source: parsed.data.source ?? "footer" },
    });
    return { status: "success", message: "Thank you — you're on the list." };
  } catch (error) {
    console.error("[newsletter] subscribe failed", error);
    return { status: "error", message: "Something went wrong. Please try again." };
  }
}
