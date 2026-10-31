import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";
import { BLOCKING_STATUSES, BOOKING_WINDOW_DAYS, DEFAULT_DURATION_MINS, TEST_DRIVE_DAYS, TEST_DRIVE_SLOTS } from "@/lib/appointments";
import { addDays, todayInZone, weekday, zonedToUtc } from "@/lib/time";

type Db = PrismaClient | Prisma.TransactionClient;

const MAX_DURATION_MS = 4 * 60 * 60_000;

/**
 * Finds a confirmed/rescheduled booking that overlaps [start, start + duration)
 * for the same vehicle — or, when given, the same staff member.
 */
export async function findConflict(
  db: Db,
  input: { vehicleId: string; start: Date; durationMins?: number; excludeId?: string; staffId?: string | null },
) {
  const duration = (input.durationMins ?? DEFAULT_DURATION_MINS) * 60_000;
  const end = new Date(input.start.getTime() + duration);
  // Bounded window so the query can use the (vehicleId, scheduledAt) index.
  const candidates = await db.testDriveBooking.findMany({
    where: {
      id: input.excludeId ? { not: input.excludeId } : undefined,
      status: { in: BLOCKING_STATUSES },
      scheduledAt: { gt: new Date(input.start.getTime() - MAX_DURATION_MS), lt: end },
      OR: [{ vehicleId: input.vehicleId }, ...(input.staffId ? [{ assignedToId: input.staffId }] : [])],
    },
    select: { id: true, scheduledAt: true, durationMins: true, vehicleId: true, assignedToId: true },
  });
  return (
    candidates.find((b) => {
      if (!b.scheduledAt) return false;
      const bEnd = b.scheduledAt.getTime() + b.durationMins * 60_000;
      return b.scheduledAt.getTime() < end.getTime() && bEnd > input.start.getTime();
    }) ?? null
  );
}

export type SlotCheck = { ok: true; start: Date } | { ok: false; message: string };

/** Validates a customer-requested slot against booking rules (not conflicts). */
export function checkRequestedSlot(date: string, time: string, timeZone: string, now = new Date()): SlotCheck {
  if (!(TEST_DRIVE_SLOTS as readonly string[]).includes(time)) return { ok: false, message: "Please choose one of the available times." };
  const today = todayInZone(timeZone, now);
  if (date < today) return { ok: false, message: "Please choose a date in the future." };
  if (date > addDays(today, BOOKING_WINDOW_DAYS)) {
    return { ok: false, message: `Bookings open up to ${BOOKING_WINDOW_DAYS} days ahead.` };
  }
  if (!TEST_DRIVE_DAYS.includes(weekday(date))) return { ok: false, message: "We're closed for test drives on that day." };
  const start = zonedToUtc(date, time, timeZone);
  if (start.getTime() < now.getTime() + 60 * 60_000) return { ok: false, message: "Please choose a time at least an hour from now." };
  return { ok: true, start };
}

/** Slots still bookable for a vehicle on a date (local time). */
export async function availableSlots(db: Db, vehicleId: string, date: string, timeZone: string): Promise<string[]> {
  const results: string[] = [];
  for (const time of TEST_DRIVE_SLOTS) {
    const check = checkRequestedSlot(date, time, timeZone);
    if (!check.ok) continue;
    const conflict = await findConflict(db, { vehicleId, start: check.start });
    if (!conflict) results.push(time);
  }
  return results;
}
