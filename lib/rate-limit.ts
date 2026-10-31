import "server-only";
import { headers } from "next/headers";
import { rateLimitKey } from "./rate-limit-core";

export function clientIp(): string {
  const h = headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Rate limit keyed by `${scope}:${client IP}`. */
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterMs: number } {
  return rateLimitKey(key, limit, windowMs);
}

export function limitByIp(scope: string, limit: number, windowMs: number): boolean {
  return rateLimitKey(`${scope}:${clientIp()}`, limit, windowMs).ok;
}
