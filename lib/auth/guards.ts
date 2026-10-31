import "server-only";
import { cache } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authOptions } from "./options";
import { can, type Permission } from "./permissions";

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

/**
 * The signed-in staff member, re-read from the database on every request so
 * deactivation and role changes take effect immediately (not at token expiry).
 */
export const getStaffUser = cache(async (): Promise<StaffUser | null> => {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
});

/** For admin pages: redirects to login, or to the dashboard when not permitted. */
export async function requirePage(permission?: Permission): Promise<StaffUser> {
  const user = await getStaffUser();
  if (!user) redirect("/admin/login");
  if (permission && !can(user.role, permission)) redirect("/admin?denied=1");
  return user;
}

export class AuthError extends Error {}

/** For server actions and route handlers: throws instead of redirecting. */
export async function requireAction(permission?: Permission): Promise<StaffUser> {
  const user = await getStaffUser();
  if (!user) throw new AuthError("Your session has expired. Please sign in again.");
  if (permission && !can(user.role, permission)) throw new AuthError("You don't have permission to do that.");
  return user;
}
