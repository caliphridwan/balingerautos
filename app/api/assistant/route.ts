import { NextResponse } from "next/server";
import { z } from "zod";
import { askAssistant, isAssistantConfigured } from "@/lib/ai/assistant";
import { rateLimitKey } from "@/lib/rate-limit-core";
import { getSiteSettings } from "@/lib/settings";

const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(1000) }))
    .min(1)
    .max(12)
    .refine((m) => m[m.length - 1]?.role === "user", "Last message must be from the user."),
});

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const settings = await getSiteSettings();
  if (!isAssistantConfigured() || !settings.assistantEnabled) return NextResponse.json({ error: "Assistant unavailable" }, { status: 503 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimitKey(`assistant:${ip}`, 20, 10 * 60_000).ok) {
    return NextResponse.json({ error: "You've sent a lot of messages. Please try again in a few minutes." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  // Conversations must alternate and start with the user.
  const messages = parsed.data.messages.slice(-10);
  while (messages[0]?.role === "assistant") messages.shift();

  try {
    const reply = await askAssistant(messages);
    return NextResponse.json({ reply: reply || "I'm sorry, I couldn't find an answer to that. Our team would be happy to help on the contact page." });
  } catch {
    return NextResponse.json({ error: "The assistant is unavailable right now. Please contact our team directly." }, { status: 502 });
  }
}
