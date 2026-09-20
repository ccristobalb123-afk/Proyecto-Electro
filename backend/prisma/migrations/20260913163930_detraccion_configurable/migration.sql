/*
  Warnings:

  - You are about to drop the column `aplica_detraccion` on the `facturas` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "facturas" DROP COLUMN "aplica_detraccion",
ADD COLUMN     "catalogo_detraccion_id" INTEGER,
ADD COLUMN     "detraccion_cuenta_bn" TEXT,
ADD COLUMN     "detraccion_medio_pago" TEXT,
ADD COLUMN     "monto_detraccion" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "facturas_por_pagar" ADD COLUMN     "catalogo_detraccion_id" INTEGER,
ADD COLUMN     "detraccion_cuenta_bn" TEXT,
ADD COLUMN     "detraccion_medio_pago" TEXT,
ADD COLUMN     "monto_detraccion" DECIMAL(12,2);

-- CreateTable
CREATE TABLE "catalogo_detraccion" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "anexo" INTEGER NOT NULL,
    "porcentaje" DECIMAL(5,4) NOT NULL,
    "monto_minimo" DECIMAL(12,2),
    "vigente_desde" DATE NOT NULL,
    "vigente_hasta" DATE,

    CONSTRAINT "catalogo_detraccion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_detraccion_codigo_key" ON "catalogo_detraccion"("codigo");

-- AddForeignKey
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_catalogo_detraccion_id_fkey" FOREIGN KEY ("catalogo_detraccion_id") REFERENCES "catalogo_detraccion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas_por_pagar" ADD CONSTRAINT "facturas_por_pagar_catalogo_detraccion_id_fkey" FOREIGN KEY ("catalogo_detraccion_id") REFERENCES "catalogo_detraccion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
