/*
  Warnings:

  - You are about to drop the `RetiroCaja` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `updatedAt` on the `Pedido` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[telefono]` on the table `Cliente` will be added. If there are existing duplicate values, this will fail.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "RetiroCaja";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GastoCaja" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT,
    "valor" INTEGER NOT NULL,
    "metodo" TEXT NOT NULL,
    "responsable" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_GastoCaja" ("createdAt", "descripcion", "id", "metodo", "responsable", "tipo", "valor") SELECT "createdAt", "descripcion", "id", "metodo", "responsable", "tipo", "valor" FROM "GastoCaja";
DROP TABLE "GastoCaja";
ALTER TABLE "new_GastoCaja" RENAME TO "GastoCaja";
CREATE INDEX "GastoCaja_createdAt_idx" ON "GastoCaja"("createdAt");
CREATE TABLE "new_Pedido" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clienteId" INTEGER NOT NULL,
    "servicio" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'RECIBIDO',
    "observacion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pedido_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Pedido" ("clienteId", "createdAt", "estado", "id", "observacion", "servicio", "total") SELECT "clienteId", "createdAt", "estado", "id", "observacion", "servicio", "total" FROM "Pedido";
DROP TABLE "Pedido";
ALTER TABLE "new_Pedido" RENAME TO "Pedido";
CREATE INDEX "Pedido_estado_idx" ON "Pedido"("estado");
CREATE INDEX "Pedido_createdAt_idx" ON "Pedido"("createdAt");
CREATE INDEX "Pedido_clienteId_idx" ON "Pedido"("clienteId");
CREATE TABLE "new_Prenda" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pedidoId" INTEGER NOT NULL,
    "servicio" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT,
    "cantidad" INTEGER NOT NULL,
    "valor" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Prenda_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Prenda" ("cantidad", "descripcion", "id", "pedidoId", "servicio", "tipo", "valor") SELECT "cantidad", "descripcion", "id", "pedidoId", "servicio", "tipo", "valor" FROM "Prenda";
DROP TABLE "Prenda";
ALTER TABLE "new_Prenda" RENAME TO "Prenda";
CREATE INDEX "Prenda_pedidoId_idx" ON "Prenda"("pedidoId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_telefono_key" ON "Cliente"("telefono");

-- CreateIndex
CREATE INDEX "Cliente_telefono_idx" ON "Cliente"("telefono");

-- CreateIndex
CREATE INDEX "Cliente_nombre_idx" ON "Cliente"("nombre");

-- CreateIndex
CREATE INDEX "EntregaParcial_pedidoId_idx" ON "EntregaParcial"("pedidoId");

-- CreateIndex
CREATE INDEX "EntregaParcial_prendaId_idx" ON "EntregaParcial"("prendaId");

-- CreateIndex
CREATE INDEX "EntregaParcial_createdAt_idx" ON "EntregaParcial"("createdAt");

-- CreateIndex
CREATE INDEX "HistorialEstado_pedidoId_idx" ON "HistorialEstado"("pedidoId");

-- CreateIndex
CREATE INDEX "HistorialEstado_estado_idx" ON "HistorialEstado"("estado");

-- CreateIndex
CREATE INDEX "HistorialEstado_createdAt_idx" ON "HistorialEstado"("createdAt");

-- CreateIndex
CREATE INDEX "Pago_pedidoId_idx" ON "Pago"("pedidoId");

-- CreateIndex
CREATE INDEX "Pago_createdAt_idx" ON "Pago"("createdAt");
