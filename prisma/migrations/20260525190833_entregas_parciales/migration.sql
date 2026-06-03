-- CreateTable
CREATE TABLE "EntregaParcial" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pedidoId" INTEGER NOT NULL,
    "prendaId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "observacion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EntregaParcial_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EntregaParcial_prendaId_fkey" FOREIGN KEY ("prendaId") REFERENCES "Prenda" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
