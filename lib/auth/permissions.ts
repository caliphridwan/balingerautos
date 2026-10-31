import type { UserRole } from "@prisma/client";

/**
 * Role → permission map. Every admin page and server action checks one of
 * these on the server; the sidebar uses the same map to hide links.
 */
export const PERMISSIONS = [
  "dashboard:view",
  "vehicles:read",
  "vehicles:write",
  "vehicles:delete",
  "vehicles:import",
  "enquiries:read_all", // without it, staff see only enquiries assigned to them
  "enquiries:write",
  "enquiries:assign",
  "appointments:read_all",
  "appointments:manage",
  "customers:read",
  "customers:write",
  "content:write",
  "settings:write",
  "users:manage",
  "reports:view",
  "data:export",
  "messages:read",
  "payments:read",
  "payments:manage", // refunds
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL = new Set<Permission>(PERMISSIONS);

const ROLE_PERMISSIONS: Record<UserRole, ReadonlySet<Permission>> = {
  SUPER_ADMIN: ALL,
  ADMIN: ALL,
  SALES_MANAGER: new Set<Permission>([
    "dashboard:view",
    "vehicles:read",
    "vehicles:write",
    "vehicles:import",
    "enquiries:read_all",
    "enquiries:write",
    "enquiries:assign",
    "appointments:read_all",
    "appointments:manage",
    "customers:read",
    "customers:write",
    "reports:view",
    "data:export",
    "messages:read",
    "payments:read",
  ]),
  SALES_REPRESENTATIVE: new Set<Permission>([
    "dashboard:view",
    "vehicles:read",
    "enquiries:write",
    "appointments:manage",
    "customers:read",
    "customers:write",
  ]),
};

export function can(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super admin",
  ADMIN: "Admin",
  SALES_MANAGER: "Sales manager",
  SALES_REPRESENTATIVE: "Sales representative",
};

/** Which roles a given role may assign to other users. */
export function assignableRoles(actor: UserRole): UserRole[] {
  if (actor === "SUPER_ADMIN") return ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "SALES_REPRESENTATIVE"];
  if (actor === "ADMIN") return ["ADMIN", "SALES_MANAGER", "SALES_REPRESENTATIVE"];
  return [];
}
