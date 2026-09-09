-- CreateTable
CREATE TABLE "Sede" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CierreCaja" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sedeId" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "CierreCaja_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CierreCaja" ("createdAt", "daviplata", "efectivo", "gastos", "id", "nequi", "observacion", "responsable", "tarjeta", "totalCaja", "transferencia") SELECT "createdAt", "daviplata", "efectivo", "gastos", "id", "nequi", "observacion", "responsable", "tarjeta", "totalCaja", "transferencia" FROM "CierreCaja";
DROP TABLE "CierreCaja";
ALTER TABLE "new_CierreCaja" RENAME TO "CierreCaja";
CREATE INDEX "CierreCaja_createdAt_idx" ON "CierreCaja"("createdAt");
CREATE INDEX "CierreCaja_sedeId_idx" ON "CierreCaja"("sedeId");
CREATE TABLE "new_Cliente" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "direccion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sedeId" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "Cliente_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Cliente" ("createdAt", "direccion", "id", "nombre", "telefono") SELECT "createdAt", "direccion", "id", "nombre", "telefono" FROM "Cliente";
DROP TABLE "Cliente";
ALTER TABLE "new_Cliente" RENAME TO "Cliente";
CREATE UNIQUE INDEX "Cliente_telefono_key" ON "Cliente"("telefono");
CREATE INDEX "Cliente_telefono_idx" ON "Cliente"("telefono");
CREATE INDEX "Cliente_nombre_idx" ON "Cliente"("nombre");
CREATE INDEX "Cliente_sedeId_idx" ON "Cliente"("sedeId");
CREATE TABLE "new_GastoCaja" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT,
    "valor" INTEGER NOT NULL,
    "metodo" TEXT NOT NULL,
    "responsable" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sedeId" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "GastoCaja_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_GastoCaja" ("createdAt", "descripcion", "id", "metodo", "responsable", "tipo", "valor") SELECT "createdAt", "descripcion", "id", "metodo", "responsable", "tipo", "valor" FROM "GastoCaja";
DROP TABLE "GastoCaja";
ALTER TABLE "new_GastoCaja" RENAME TO "GastoCaja";
CREATE INDEX "GastoCaja_createdAt_idx" ON "GastoCaja"("createdAt");
CREATE INDEX "GastoCaja_sedeId_idx" ON "GastoCaja"("sedeId");
CREATE TABLE "new_Pedido" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clienteId" INTEGER NOT NULL,
    "servicio" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'RECIBIDO',
    "observacion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sedeId" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "Pedido_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pedido_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Pedido" ("clienteId", "createdAt", "estado", "id", "observacion", "servicio", "total") SELECT "clienteId", "createdAt", "estado", "id", "observacion", "servicio", "total" FROM "Pedido";
DROP TABLE "Pedido";
ALTER TABLE "new_Pedido" RENAME TO "Pedido";
CREATE INDEX "Pedido_estado_idx" ON "Pedido"("estado");
CREATE INDEX "Pedido_createdAt_idx" ON "Pedido"("createdAt");
CREATE INDEX "Pedido_clienteId_idx" ON "Pedido"("clienteId");
CREATE INDEX "Pedido_sedeId_idx" ON "Pedido"("sedeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
