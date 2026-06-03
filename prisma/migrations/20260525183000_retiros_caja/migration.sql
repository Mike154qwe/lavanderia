-- CreateTable
CREATE TABLE "RetiroCaja" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "valor" INTEGER NOT NULL,
    "motivo" TEXT,
    "metodo" TEXT NOT NULL DEFAULT 'Efectivo',
    "responsable" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
