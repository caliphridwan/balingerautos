"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  AppointmentStatus,
  CommunicationChannel,
  ContactMessageStatus,
  EnquiryStatus,
  EnquiryType,
  Prisma,
} from "@prisma/client";
import { fail, unexpected, type ActionResult } from "@/lib/actions";
import { logActivity } from "@/lib/activity";
import { BLOCKING_STATUSES } from "@/lib/appointments";
import { AuthError, requireAction, type StaffUser } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { sendEmail } from "@/lib/email/send";
import { appointmentUpdate } from "@/lib/email/templates";
import { appointmentScope, enquiryScope } from "@/lib/leads/access";
import { brandFromSettings, generateReference } from "@/lib/leads/create";
import { ENQUIRY_STATUS_LABELS } from "@/lib/leads/labels";
import { findConflict } from "@/lib/leads/scheduling";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/settings";
import { formatInZone, zonedToUtc } from "@/lib/time";
import { vehicleTitle } from "@/lib/vehicles/format";

function handle(scope: string, error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return fail(error.message);
  if (error instanceof ConflictError) return fail(error.message);
  return unexpected(scope, error);
}

class ConflictError extends Error {}

async function loadEnquiry(user: StaffUser, id: string) {
  const enquiry = await prisma.vehicleEnquiry.findFirst({ where: { id, ...enquiryScope(user) }, select: { id: true, reference: true, status: true } });
  if (!enquiry) throw new AuthError("Enquiry not found or not assigned to you.");
  return enquiry;
}

function refreshEnquiry(id: string) {
  revalidatePath(`/admin/enquiries/${id}`);
  revalidatePath("/admin/enquiries");
  revalidatePath("/admin");
}

// ── Enquiries ───────────────────────────────────────────────────────

export async function updateEnquiryStatus(id: string, status: EnquiryStatus): Promise<ActionResult> {
  try {
    const user = await requireAction("enquiries:write");
    if (!Object.values(EnquiryStatus).includes(status)) return fail("Unknown status.");
    const enquiry = await loadEnquiry(user, id);
    const closing = status === EnquiryStatus.CLOSED || status === EnquiryStatus.CANCELLED || status === EnquiryStatus.CONVERTED;
    await prisma.$transaction(async (tx) => {
      await tx.vehicleEnquiry.update({ where: { id }, data: { status, closedAt: closing ? new Date() : null } });
      await tx.enquiryCommunication.create({
        data: { enquiryId: id, authorId: user.id, channel: CommunicationChannel.NOTE, body: `Status changed: ${ENQUIRY_STATUS_LABELS[enquiry.status]} → ${ENQUIRY_STATUS_LABELS[status]}` },
      });
      await logActivity({ actorId: user.id, action: "enquiry.status_changed", entityType: "VehicleEnquiry", entityId: id, summary: `set ${enquiry.reference} to ${ENQUIRY_STATUS_LABELS[status]}` }, tx);
    });
    refreshEnquiry(id);
    return { ok: true, message: "Status updated." };
  } catch (error) {
    return handle("updateEnquiryStatus", error);
  }
}

export async function setEnquiryFollowUp(id: string, date: string | null): Promise<ActionResult> {
  try {
    const user = await requireAction("enquiries:write");
    await loadEnquiry(user, id);
    if (date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail("Choose a valid date.");
    const settings = await getSiteSettings();
    const followUpAt = date ? zonedToUtc(date, "09:00", settings.timezone) : null;
    await prisma.vehicleEnquiry.update({
      where: { id },
      data: { followUpAt, ...(date ? { status: EnquiryStatus.FOLLOW_UP } : {}) },
    });
    await logActivity({ actorId: user.id, action: "enquiry.follow_up_set", entityType: "VehicleEnquiry", entityId: id, summary: date ? `set a follow-up for ${date}` : "cleared a follow-up" });
    refreshEnquiry(id);
    return { ok: true, message: date ? "Follow-up scheduled." : "Follow-up cleared." };
  } catch (error) {
    return handle("setEnquiryFollowUp", error);
  }
}

export async function assignEnquiry(id: string, userId: string | null): Promise<ActionResult> {
  try {
    const actor = await requireAction("enquiries:assign");
    const enquiry = await prisma.vehicleEnquiry.findUnique({ where: { id }, select: { reference: true } });
    if (!enquiry) return fail("Enquiry not found.");
    const rep = userId ? await prisma.user.findFirst({ where: { id: userId, isActive: true }, select: { id: true, name: true } }) : null;
    if (userId && !rep) return fail("That staff member isn't active.");
    await prisma.$transaction(async (tx) => {
      await tx.salesRepresentativeAssignment.updateMany({ where: { enquiryId: id, isActive: true }, data: { isActive: false, endedAt: new Date() } });
      if (rep) {
        await tx.salesRepresentativeAssignment.create({ data: { enquiryId: id, userId: rep.id, assignedById: actor.id } });
        await tx.notification.create({
          data: { userId: rep.id, type: "lead.assigned", title: `Enquiry ${enquiry.reference} assigned to you`, link: `/admin/enquiries/${id}` },
        });
      }
      await tx.enquiryCommunication.create({
        data: { enquiryId: id, authorId: actor.id, channel: CommunicationChannel.NOTE, body: rep ? `Assigned to ${rep.name}` : "Unassigned" },
      });
      await logActivity({ actorId: actor.id, action: "enquiry.assigned", entityType: "VehicleEnquiry", entityId: id, summary: rep ? `assigned ${enquiry.reference} to ${rep.name}` : `unassigned ${enquiry.reference}` }, tx);
    });
    refreshEnquiry(id);
    return { ok: true, message: rep ? `Assigned to ${rep.name}.` : "Unassigned." };
  } catch (error) {
    return handle("assignEnquiry", error);
  }
}

const communicationSchema = z.object({
  channel: z.nativeEnum(CommunicationChannel),
  body: z.string().trim().min(1, "Write a note.").max(5000),
});

export async function addEnquiryCommunication(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireAction("enquiries:write");
    const enquiry = await loadEnquiry(user, id);
    const parsed = communicationSchema.safeParse({ channel: formData.get("channel"), body: formData.get("body") });
    if (!parsed.success) return { ok: false, message: "Please write a note.", fieldErrors: parsed.error.flatten().fieldErrors };
    await prisma.$transaction(async (tx) => {
      await tx.enquiryCommunication.create({ data: { enquiryId: id, authorId: user.id, ...parsed.data } });
      // Logging contact with the customer moves a NEW lead to CONTACTED.
      if (enquiry.status === EnquiryStatus.NEW && parsed.data.channel !== CommunicationChannel.NOTE) {
        await tx.vehicleEnquiry.update({ where: { id }, data: { status: EnquiryStatus.CONTACTED } });
      }
    });
    refreshEnquiry(id);
    return { ok: true, message: "Added to history." };
  } catch (error) {
    return handle("addEnquiryCommunication", error);
  }
}

// ── Appointments ────────────────────────────────────────────────────

async function loadBooking(user: StaffUser, id: string) {
  const booking = await prisma.testDriveBooking.findFirst({
    where: { id, ...appointmentScope(user) },
    include: {
      customer: { select: { fullName: true, email: true } },
      vehicle: { select: { year: true, make: true, model: true, trim: true } },
      enquiry: { select: { id: true, reference: true } },
    },
  });
  if (!booking) throw new AuthError("Appointment not found or not assigned to you.");
  return booking;
}

type Booking = Awaited<ReturnType<typeof loadBooking>>;

async function emailCustomer(booking: Booking, kind: "confirmed" | "rescheduled" | "rejected" | "cancelled", start: Date | null, note?: string) {
  const settings = await getSiteSettings();
  const when = start ? formatInZone(start, settings.timezone, settings.locale, { dateStyle: "full", timeStyle: "short" }) : "—";
  const mail = appointmentUpdate(brandFromSettings(settings), {
    name: booking.customer.fullName,
    kind,
    vehicleTitle: vehicleTitle(booking.vehicle),
    when,
    reference: booking.enquiry?.reference,
    note: note || null,
  });
  await sendEmail({ to: booking.customer.email, replyTo: settings.email ?? undefined, ...mail });
}

function refreshAppointments(enquiryId?: string | null) {
  revalidatePath("/admin/appointments");
  revalidatePath("/admin");
  if (enquiryId) revalidatePath(`/admin/enquiries/${enquiryId}`);
}

/**
 * Confirms (or reschedules) a booking. The overlap check and the update run in
 * one SERIALIZABLE transaction, so two staff confirming overlapping slots at
 * the same moment can't both succeed.
 */
async function scheduleBooking(user: StaffUser, booking: Booking, start: Date, status: AppointmentStatus, date?: string, time?: string) {
  await prisma.$transaction(
    async (tx) => {
      const conflict = await findConflict(tx, {
        vehicleId: booking.vehicleId,
        start,
        durationMins: booking.durationMins,
        excludeId: booking.id,
        staffId: booking.assignedToId,
      });
      if (conflict) {
        throw new ConflictError(
          conflict.vehicleId === booking.vehicleId
            ? "This vehicle already has a confirmed appointment that overlaps this time."
            : "The assigned staff member already has an appointment at this time.",
        );
      }
      await tx.testDriveBooking.update({
        where: { id: booking.id },
        data: {
          status,
          scheduledAt: start,
          ...(date && time ? { preferredDate: new Date(`${date}T00:00:00.000Z`), preferredTime: time } : {}),
        },
      });
      if (booking.enquiry) {
        await tx.enquiryCommunication.create({
          data: { enquiryId: booking.enquiry.id, authorId: user.id, channel: CommunicationChannel.NOTE, body: `Test drive ${status === AppointmentStatus.RESCHEDULED ? "rescheduled" : "confirmed"}` },
        });
        await tx.vehicleEnquiry.updateMany({ where: { id: booking.enquiry.id, status: EnquiryStatus.NEW }, data: { status: EnquiryStatus.CONTACTED } });
      }
      await logActivity({ actorId: user.id, action: `appointment.${status.toLowerCase()}`, entityType: "TestDriveBooking", entityId: booking.id, summary: `${status === AppointmentStatus.RESCHEDULED ? "rescheduled" : "confirmed"} a test drive for ${booking.customer.fullName}` }, tx);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function confirmAppointment(id: string): Promise<ActionResult> {
  try {
    const user = await requireAction("appointments:manage");
    const booking = await loadBooking(user, id);
    if (!booking.scheduledAt) return fail("This booking has no time set. Use Reschedule to choose one.");
    if (booking.scheduledAt < new Date()) return fail("That time has passed. Reschedule it instead.");
    await scheduleBooking(user, booking, booking.scheduledAt, AppointmentStatus.CONFIRMED);
    await emailCustomer(booking, "confirmed", booking.scheduledAt);
    refreshAppointments(booking.enquiry?.id);
    return { ok: true, message: "Confirmed — the customer has been emailed." };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return fail("Another change happened at the same time. Please try again.");
    return handle("confirmAppointment", error);
  }
}

const rescheduleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Choose a time."),
  note: z.string().trim().max(500).optional(),
});

export async function rescheduleAppointment(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireAction("appointments:manage");
    const booking = await loadBooking(user, id);
    const parsed = rescheduleSchema.safeParse({ date: formData.get("date"), time: formData.get("time"), note: formData.get("note") || undefined });
    if (!parsed.success) return { ok: false, message: "Choose a date and time.", fieldErrors: parsed.error.flatten().fieldErrors };
    const settings = await getSiteSettings();
    const start = zonedToUtc(parsed.data.date, parsed.data.time, settings.timezone);
    if (start < new Date()) return fail("Choose a time in the future.");
    await scheduleBooking(user, booking, start, AppointmentStatus.RESCHEDULED, parsed.data.date, parsed.data.time);
    await emailCustomer(booking, "rescheduled", start, parsed.data.note);
    refreshAppointments(booking.enquiry?.id);
    return { ok: true, message: "Rescheduled — the customer has been emailed." };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return fail("Another change happened at the same time. Please try again.");
    return handle("rescheduleAppointment", error);
  }
}

async function closeBooking(id: string, status: AppointmentStatus, opts: { email?: "rejected" | "cancelled"; outcome?: string }): Promise<ActionResult> {
  try {
    const user = await requireAction("appointments:manage");
    const booking = await loadBooking(user, id);
    await prisma.$transaction(async (tx) => {
      await tx.testDriveBooking.update({ where: { id }, data: { status, outcome: opts.outcome ?? booking.outcome } });
      if (booking.enquiry) {
        await tx.enquiryCommunication.create({
          data: { enquiryId: booking.enquiry.id, authorId: user.id, channel: CommunicationChannel.NOTE, body: `Test drive marked ${status.toLowerCase().replace("_", " ")}${opts.outcome ? `: ${opts.outcome}` : ""}` },
        });
      }
      await logActivity({ actorId: user.id, action: `appointment.${status.toLowerCase()}`, entityType: "TestDriveBooking", entityId: id, summary: `marked a test drive for ${booking.customer.fullName} as ${status.toLowerCase()}` }, tx);
    });
    if (opts.email) await emailCustomer(booking, opts.email, booking.scheduledAt, opts.outcome);
    refreshAppointments(booking.enquiry?.id);
    return { ok: true, message: "Updated." };
  } catch (error) {
    return handle(`appointment:${status}`, error);
  }
}

export async function rejectAppointment(id: string, note?: string): Promise<ActionResult> {
  return closeBooking(id, AppointmentStatus.REJECTED, { email: "rejected", outcome: note?.slice(0, 500) });
}

export async function cancelAppointment(id: string): Promise<ActionResult> {
  return closeBooking(id, AppointmentStatus.CANCELLED, { email: "cancelled" });
}

export async function markNoShow(id: string): Promise<ActionResult> {
  return closeBooking(id, AppointmentStatus.NO_SHOW, {});
}

export async function completeAppointment(id: string, formData: FormData): Promise<ActionResult> {
  const outcome = String(formData.get("outcome") ?? "").trim().slice(0, 2000);
  return closeBooking(id, AppointmentStatus.COMPLETED, { outcome: outcome || undefined });
}

export async function assignAppointment(id: string, userId: string | null): Promise<ActionResult> {
  try {
    const actor = await requireAction("appointments:read_all");
    const booking = await loadBooking(actor, id);
    const staff = userId ? await prisma.user.findFirst({ where: { id: userId, isActive: true }, select: { id: true, name: true } }) : null;
    if (userId && !staff) return fail("That staff member isn't active.");
    if (staff && booking.scheduledAt && BLOCKING_STATUSES.includes(booking.status)) {
      const clash = await findConflict(prisma, { vehicleId: "__none__", start: booking.scheduledAt, durationMins: booking.durationMins, excludeId: id, staffId: staff.id });
      if (clash) return fail(`${staff.name} already has an appointment at that time.`);
    }
    await prisma.testDriveBooking.update({ where: { id }, data: { assignedToId: staff?.id ?? null } });
    if (staff) {
      await prisma.notification.create({
        data: { userId: staff.id, type: "appointment.assigned", title: `Test drive with ${booking.customer.fullName} assigned to you`, link: `/admin/appointments?open=${id}` },
      });
    }
    await logActivity({ actorId: actor.id, action: "appointment.assigned", entityType: "TestDriveBooking", entityId: id, summary: staff ? `assigned a test drive to ${staff.name}` : "unassigned a test drive" });
    refreshAppointments(booking.enquiry?.id);
    return { ok: true, message: staff ? `Assigned to ${staff.name}.` : "Unassigned." };
  } catch (error) {
    return handle("assignAppointment", error);
  }
}

// ── Customers ───────────────────────────────────────────────────────

export async function updateCustomer(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireAction("customers:write");
    const parsed = z
      .object({
        fullName: z.string().trim().min(2).max(100),
        phone: z.string().trim().max(20).optional(),
        notes: z.string().trim().max(5000).optional(),
      })
      .safeParse({ fullName: formData.get("fullName"), phone: formData.get("phone") || undefined, notes: formData.get("notes") || undefined });
    if (!parsed.success) return { ok: false, message: "Please check the details.", fieldErrors: parsed.error.flatten().fieldErrors };
    // Reps may only edit customers connected to their enquiries.
    if (!can(user.role, "enquiries:read_all")) {
      const linked = await prisma.vehicleEnquiry.count({ where: { customerId: id, ...enquiryScope(user) } });
      if (!linked) return fail("You can only edit customers on your enquiries.");
    }
    await prisma.customer.update({ where: { id }, data: { fullName: parsed.data.fullName, phone: parsed.data.phone ?? null, notes: parsed.data.notes ?? null } });
    await logActivity({ actorId: user.id, action: "customer.updated", entityType: "Customer", entityId: id, summary: `updated customer ${parsed.data.fullName}` });
    revalidatePath(`/admin/customers/${id}`);
    return { ok: true, message: "Customer saved." };
  } catch (error) {
    return handle("updateCustomer", error);
  }
}

// ── Contact messages ────────────────────────────────────────────────

export async function setMessageStatus(id: string, status: ContactMessageStatus): Promise<ActionResult> {
  try {
    const user = await requireAction("messages:read");
    if (!Object.values(ContactMessageStatus).includes(status)) return fail("Unknown status.");
    await prisma.contactMessage.update({ where: { id }, data: { status } });
    await logActivity({ actorId: user.id, action: "message.status_changed", entityType: "ContactMessage", entityId: id, summary: `marked a message as ${status.toLowerCase()}` });
    revalidatePath("/admin/messages");
    return { ok: true };
  } catch (error) {
    return handle("setMessageStatus", error);
  }
}

/** Turns a contact-form message into a tracked lead. */
export async function convertMessageToEnquiry(id: string): Promise<ActionResult<{ enquiryId: string }>> {
  try {
    const user = await requireAction("messages:read");
    const msg = await prisma.contactMessage.findUnique({ where: { id } });
    if (!msg) return fail("Message not found.");
    const enquiry = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.upsert({
        where: { email: msg.email },
        update: {},
        create: { email: msg.email, fullName: msg.fullName, phone: msg.phone },
      });
      const created = await tx.vehicleEnquiry.create({
        data: {
          reference: generateReference(),
          type: msg.category === EnquiryType.TEST_DRIVE ? EnquiryType.GENERAL : msg.category,
          customerId: customer.id,
          message: [msg.subject, msg.message].filter(Boolean).join("\n\n"),
          source: "contact_form",
        },
      });
      await tx.contactMessage.update({ where: { id }, data: { status: ContactMessageStatus.ARCHIVED } });
      await logActivity({ actorId: user.id, action: "message.converted", entityType: "VehicleEnquiry", entityId: created.id, summary: `converted a message from ${msg.fullName} into an enquiry` }, tx);
      return created;
    });
    revalidatePath("/admin/messages");
    revalidatePath("/admin/enquiries");
    return { ok: true, message: "Converted to an enquiry.", data: { enquiryId: enquiry.id } };
  } catch (error) {
    return handle("convertMessageToEnquiry", error);
  }
}
