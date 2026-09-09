-- Baseline: documenta la tabla CierreCaja, que ya existía en la base de datos
-- (creada previamente fuera del flujo de Prisma Migrate) pero nunca había
-- quedado registrada en el historial de migraciones.
CREATE TABLE IF NOT EXISTS "CierreCaja" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "efectivo" INTEGER NOT NULL DEFAULT 0,
    "nequi" INTEGER NOT NULL DEFAULT 0,
    "daviplata" INTEGER NOT NULL DEFAULT 0,
    "transferencia" INTEGER NOT NULL DEFAULT 0,
    "tarjeta" INTEGER NOT NULL DEFAULT 0,
    "gastos" INTEGER NOT NULL DEFAULT 0,
    "totalCaja" INTEGER NOT NULL DEFAULT 0,
    "responsable" TEXT,
    "observacion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "CierreCaja_createdAt_idx" ON "CierreCaja"("createdAt");
