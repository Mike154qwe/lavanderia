-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Prenda" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pedidoId" INTEGER NOT NULL,
    "servicio" TEXT NOT NULL DEFAULT 'Lavado',
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "valor" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Prenda_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Prenda" ("cantidad", "descripcion", "id", "pedidoId", "tipo") SELECT "cantidad", "descripcion", "id", "pedidoId", "tipo" FROM "Prenda";
DROP TABLE "Prenda";
ALTER TABLE "new_Prenda" RENAME TO "Prenda";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
