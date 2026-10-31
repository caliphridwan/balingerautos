"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { fail, fromZodError, unexpected, type ActionResult } from "@/lib/actions";
import { logActivity } from "@/lib/activity";
import { AuthError, requireAction } from "@/lib/auth/guards";
import { assignableRoles, ROLE_LABELS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

const password = z.string().min(12, "Use at least 12 characters.").max(200);

function handle(scope: string, error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return fail(error.message);
  return unexpected(scope, error);
}

async function activeSuperAdmins(excludeId?: string): Promise<number> {
  return prisma.user.count({ where: { role: UserRole.SUPER_ADMIN, isActive: true, ...(excludeId ? { id: { not: excludeId } } : {}) } });
}

export async function createUser(formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireAction("users:manage");
    const parsed = z
      .object({
        name: z.string().trim().min(2).max(80),
        email: z.string().trim().toLowerCase().email().max(254),
        phone: z.string().trim().max(30).optional(),
        role: z.nativeEnum(UserRole),
        password,
      })
      .safeParse({ ...Object.fromEntries(formData), phone: formData.get("phone") || undefined });
    if (!parsed.success) return fromZodError(parsed.error);
    if (!assignableRoles(actor.role).includes(parsed.data.role)) return fail(`You can't create ${ROLE_LABELS[parsed.data.role]} accounts.`);
    if (await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } })) {
      return { ok: false, message: "An account with that email already exists.", fieldErrors: { email: ["Already in use."] } };
    }
    const user = await prisma.user.create({
      data: { name: parsed.data.name, email: parsed.data.email, phone: parsed.data.phone, role: parsed.data.role, passwordHash: await bcrypt.hash(parsed.data.password, 12) },
    });
    await logActivity({ actorId: actor.id, action: "user.created", entityType: "User", entityId: user.id, summary: `created ${ROLE_LABELS[user.role]} account for ${user.name}` });
    revalidatePath("/admin/users");
    return { ok: true, message: `Account created for ${user.name}. Share the password with them securely.` };
  } catch (error) {
    return handle("createUser", error);
  }
}

export async function updateUser(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireAction("users:manage");
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return fail("User not found.");
    const parsed = z
      .object({ name: z.string().trim().min(2).max(80), role: z.nativeEnum(UserRole), isActive: z.boolean() })
      .safeParse({ name: formData.get("name"), role: formData.get("role"), isActive: formData.get("isActive") === "on" });
    if (!parsed.success) return fromZodError(parsed.error);
    const { role, isActive } = parsed.data;

    // Only super admins may manage super admins; nobody can lock themselves out.
    if (target.role === UserRole.SUPER_ADMIN && actor.role !== UserRole.SUPER_ADMIN) return fail("Only a super admin can change a super admin.");
    if (role !== target.role && !assignableRoles(actor.role).includes(role)) return fail(`You can't assign the ${ROLE_LABELS[role]} role.`);
    if (target.id === actor.id && (!isActive || role !== target.role)) return fail("You can't change your own role or deactivate yourself.");
    if (target.role === UserRole.SUPER_ADMIN && (role !== UserRole.SUPER_ADMIN || !isActive) && (await activeSuperAdmins(target.id)) === 0) {
      return fail("There must always be at least one active super admin.");
    }

    await prisma.user.update({ where: { id }, data: { name: parsed.data.name, role, isActive } });
    await logActivity({
      actorId: actor.id,
      action: "user.updated",
      entityType: "User",
      entityId: id,
      summary: `updated ${target.name}${role !== target.role ? ` (role: ${ROLE_LABELS[role]})` : ""}${isActive !== target.isActive ? (isActive ? " (reactivated)" : " (deactivated)") : ""}`,
    });
    revalidatePath("/admin/users");
    return { ok: true, message: "Saved." };
  } catch (error) {
    return handle("updateUser", error);
  }
}

export async function resetUserPassword(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireAction("users:manage");
    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, role: true } });
    if (!target) return fail("User not found.");
    if (target.role === UserRole.SUPER_ADMIN && actor.role !== UserRole.SUPER_ADMIN) return fail("Only a super admin can reset a super admin's password.");
    const parsed = password.safeParse(formData.get("password"));
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid password.", fieldErrors: { password: [parsed.error.issues[0]?.message ?? "Invalid"] } };
    await prisma.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(parsed.data, 12) } });
    await logActivity({ actorId: actor.id, action: "user.password_reset", entityType: "User", entityId: id, summary: `reset the password for ${target.name}` });
    return { ok: true, message: "Password updated." };
  } catch (error) {
    return handle("resetUserPassword", error);
  }
}

export async function changeOwnPassword(formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireAction();
    const user = await prisma.user.findUnique({ where: { id: actor.id } });
    if (!user) return fail("Account not found.");
    const parsed = z
      .object({ current: z.string().min(1, "Enter your current password."), next: password, confirm: z.string() })
      .refine((v) => v.next === v.confirm, { path: ["confirm"], message: "Passwords don't match." })
      .safeParse(Object.fromEntries(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    if (!(await bcrypt.compare(parsed.data.current, user.passwordHash))) {
      return { ok: false, message: "Your current password is incorrect.", fieldErrors: { current: ["Incorrect password."] } };
    }
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(parsed.data.next, 12) } });
    await logActivity({ actorId: user.id, action: "user.password_changed", entityType: "User", entityId: user.id, summary: "changed their password" });
    return { ok: true, message: "Password changed." };
  } catch (error) {
    return handle("changeOwnPassword", error);
  }
}

export async function markNotificationsRead(ids?: string[]): Promise<ActionResult> {
  try {
    const actor = await requireAction();
    await prisma.notification.updateMany({
      where: { userId: actor.id, readAt: null, ...(ids?.length ? { id: { in: ids.slice(0, 200) } } : {}) },
      data: { readAt: new Date() },
    });
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Marked as read." };
  } catch (error) {
    return handle("markNotificationsRead", error);
  }
}
