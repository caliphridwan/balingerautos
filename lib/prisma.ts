import { PrismaClient } from "@prisma/client";

/**
 * In development, turn off Prisma's prepared-statement cache.
 *
 * The dev server keeps one database connection alive across hot reloads. When a
 * migration or seed changes the tables underneath it, Postgres rejects the old
 * cached queries with "cached plan must not change result type" (code 0A000).
 * Without the cache, schema changes are picked up straight away and no restart
 * is needed. Production keeps the cache for speed (deploys restart the server).
 */
function datasourceUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw || process.env.NODE_ENV === "production") return undefined;
  try {
    const url = new URL(raw);
    if (!url.searchParams.has("statement_cache_size") && !url.searchParams.has("pgbouncer")) {
      url.searchParams.set("statement_cache_size", "0");
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

// Reuse a single client across hot reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: datasourceUrl(),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
