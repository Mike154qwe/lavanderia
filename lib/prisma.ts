import { PrismaClient } from "@prisma/client";

// RNF04 — decisión documentada, no callada: prisma/dev.db NO tiene cifrado en
// reposo (SQLCipher u otro). Se evaluó y se descartó a propósito para este
// alcance:
//   - Amenaza real a mitigar: acceso no autenticado vía la app web (cubierto
//     por login + AUTH_SECRET real, ver lib/auth.ts y proxy.ts) y control de
//     acceso por rol a pantallas con datos personales (ver lib/validacion-cliente.ts
//     y las restricciones de proxy.ts sobre /clientes, /gerente, etc.).
//   - Lo que el cifrado en reposo SÍ agregaría: protección si alguien copia el
//     archivo .db directamente del disco (acceso físico a la PC, o a un backup
//     sin proteger). Es una amenaza real pero de otra capa (seguridad del
//     equipo/backup, no de la aplicación), y el despliegue actual es un único
//     PC local sin exposición a internet -- el costo de integrar SQLCipher
//     (cambiar el driver de Prisma, gestionar la clave de cifrado, migrar la
//     base existente) no se justifica frente al riesgo real de un prototipo
//     académico de este tamaño y esta topología.
//   - Si el despliegue cambia (multi-sede, backups a la nube sin cifrar,
//     equipo compartido con más gente), esto debe reevaluarse -- no es una
//     garantía permanente, es una decisión de alcance para esta versión.
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
