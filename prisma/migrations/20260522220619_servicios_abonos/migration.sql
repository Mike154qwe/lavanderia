/*
  Warnings:

  - You are about to drop the column `valorUnitario` on the `Prenda` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Pedido" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clienteId" INTEGER NOT NULL,
    "servicio" TEXT NOT NULL DEFAULT 'Lavado',
    "estado" TEXT NOT NULL DEFAULT 'RECIBIDO',
    "total" INTEGER NOT NULL DEFAULT 0,
    "observacion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pedido_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Pedido" ("clienteId", "createdAt", "estado", "id", "observacion", "total", "updatedAt") SELECT "clienteId", "createdAt", "estado", "id", "observacion", "total", "updatedAt" FROM "Pedido";
DROP TABLE "Pedido";
ALTER TABLE "new_Pedido" RENAME TO "Pedido";
CREATE TABLE "new_Prenda" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pedidoId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "Prenda_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Prenda" ("cantidad", "descripcion", "id", "pedidoId", "tipo") SELECT "cantidad", "descripcion", "id", "pedidoId", "tipo" FROM "Prenda";
DROP TABLE "Prenda";
ALTER TABLE "new_Prenda" RENAME TO "Prenda";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
