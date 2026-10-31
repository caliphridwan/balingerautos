import "server-only";
import type { Prisma, PrismaClient, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = PrismaClient | Prisma.TransactionClient;

export async function logActivity(
  input: { actorId?: string | null; action: string; entityType: string; entityId: string; summary?: string; metadata?: Prisma.InputJsonValue },
  db: Db = prisma,
): Promise<void> {
  await db.activityLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      summary: input.summary,
      metadata: input.metadata,
    },
  });
}

const NOTIFY_ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"];

/** In-dashboard notification for managers (plus any extra user ids, e.g. the assigned rep). */
export async function notifyStaff(
  input: { type: string; title: string; body?: string; link?: string; extraUserIds?: string[] },
  db: Db = prisma,
): Promise<void> {
  const managers = await db.user.findMany({ where: { isActive: true, role: { in: NOTIFY_ROLES } }, select: { id: true } });
  const ids = new Set([...managers.map((m) => m.id), ...(input.extraUserIds ?? [])]);
  if (ids.size === 0) return;
  await db.notification.createMany({
    data: Array.from(ids).map((userId) => ({ userId, type: input.type, title: input.title, body: input.body, link: input.link })),
  });
}
