import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

/** Maps server-side Zod field errors back onto React Hook Form fields. */
export function applyServerErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  fieldErrors: Record<string, string[] | undefined> | undefined,
): void {
  if (!fieldErrors) return;
  for (const [field, messages] of Object.entries(fieldErrors)) {
    const message = messages?.[0];
    if (message) setError(field as Path<T>, { type: "server", message });
  }
}
