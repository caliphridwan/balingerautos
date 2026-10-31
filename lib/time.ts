/**
 * Time-zone helpers without extra dependencies. Appointments are entered in
 * the showroom's local time (SiteSettings.timezone) and stored in UTC.
 */

/** Offset in ms between UTC and `timeZone` at the given instant. */
function tzOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - instant.getTime();
}

/** "2026-11-02" + "14:00" in Africa/Lagos → the UTC Date for that moment. */
export function zonedToUtc(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0);
  let result = guess - tzOffsetMs(new Date(guess), timeZone);
  // Second pass corrects for DST transitions between guess and result.
  result = guess - tzOffsetMs(new Date(result), timeZone);
  return new Date(result);
}

/** Today's date in `timeZone` as YYYY-MM-DD. */
export function todayInZone(timeZone: string, from = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(from);
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + days));
  return dt.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday, for a YYYY-MM-DD date. */
export function weekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)).getUTCDay();
}

export function formatInZone(
  date: Date,
  timeZone: string,
  locale = "en-US",
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" },
): string {
  return new Intl.DateTimeFormat(locale, { timeZone, ...options }).format(date);
}

/** "HH:mm" of a UTC instant, in `timeZone`. */
export function timeInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
}

/** YYYY-MM-DD of a UTC instant, in `timeZone`. */
export function dateInZone(date: Date, timeZone: string): string {
  return todayInZone(timeZone, date);
}

/** Monday (YYYY-MM-DD) of the week containing `date`. */
export function startOfWeek(date: string): string {
  const day = weekday(date);
  return addDays(date, day === 0 ? -6 : 1 - day);
}
