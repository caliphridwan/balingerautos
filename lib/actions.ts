import type { ZodError } from "zod";

/** Standard return shape for every server action. */
export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string[] | undefined> };

export function fromZodError(error: ZodError, message = "Please check the highlighted fields."): ActionResult<never> {
  return { ok: false, message, fieldErrors: error.flatten().fieldErrors as Record<string, string[] | undefined> };
}

export function fail(message: string): ActionResult<never> {
  return { ok: false, message };
}

/** Logs the real error server-side and returns a safe message to the client. */
export function unexpected(scope: string, error: unknown): ActionResult<never> {
  console.error(`[${scope}]`, error);
  return { ok: false, message: "Something went wrong. Please try again." };
}
