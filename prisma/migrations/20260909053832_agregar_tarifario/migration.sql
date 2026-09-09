-- CreateTable
CREATE TABLE "Tarifario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "categoria" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "precioMin" INTEGER NOT NULL,
    "precioMax" INTEGER
);

-- CreateIndex
CREATE INDEX "Tarifario_categoria_idx" ON "Tarifario"("categoria");

-- CreateIndex
CREATE UNIQUE INDEX "Tarifario_categoria_item_key" ON "Tarifario"("categoria", "item");
