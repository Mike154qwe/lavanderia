import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["error", "warn"],
  });

globalForPrisma.prisma = prisma;

// WAL mode: persiste en el archivo .db, idempotente si ya está activo
// $queryRawUnsafe porque PRAGMA devuelve filas (executeRaw falla con SQLite)
void prisma
  .$queryRawUnsafe("PRAGMA journal_mode=WAL")
  .then(() => prisma.$queryRawUnsafe("PRAGMA synchronous=NORMAL"))
  .catch(() => {});
