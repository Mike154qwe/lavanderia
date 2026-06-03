-- CreateTable
CREATE TABLE "GastoCaja" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT,
    "valor" INTEGER NOT NULL,
    "metodo" TEXT NOT NULL DEFAULT 'Efectivo',
    "responsable" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
