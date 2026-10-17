-- Gastos: tipo de comprobante (Boleta o Factura) y RUC del proveedor.
-- Aditiva: columnas que aceptan NULL; los gastos existentes no se tocan
-- (se completan al editarlos). Reversa en prisma/rollback/.

CREATE TYPE "TipoComprobante" AS ENUM ('BOLETA', 'FACTURA');

ALTER TABLE "gastos"
  ADD COLUMN "tipo_comprobante" "TipoComprobante",
  ADD COLUMN "ruc_proveedor" VARCHAR(11);

-- El RUC son 11 dígitos, y una Factura siempre lo tiene. Los gastos
-- antiguos (tipo NULL) cumplen ambas reglas.
ALTER TABLE "gastos"
  ADD CONSTRAINT "gastos_ruc_formato" CHECK ("ruc_proveedor" IS NULL OR "ruc_proveedor" ~ '^[0-9]{11}$'),
  ADD CONSTRAINT "gastos_factura_con_ruc" CHECK ("tipo_comprobante" IS DISTINCT FROM 'FACTURA' OR "ruc_proveedor" IS NOT NULL);
