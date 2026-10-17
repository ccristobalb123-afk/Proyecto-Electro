-- Reversa de 20261016230000_gasto_comprobante.
--
-- Quita el tipo de comprobante, el RUC del proveedor y sus CHECK. Se
-- pierden esos dos datos de cada gasto; el resto (y los documentos
-- adjuntos) se conserva.
--
-- Uso (en backend/), con el código ANTERIOR ya restaurado y PM2 detenido:
--   psql -v ON_ERROR_STOP=1 -f prisma/rollback/20261016230000_gasto_comprobante.down.sql   (credenciales por ~/.pgpass)
--   psql -c "DELETE FROM _prisma_migrations WHERE migration_name = '20261016230000_gasto_comprobante';"
BEGIN;
ALTER TABLE "gastos"
  DROP CONSTRAINT IF EXISTS "gastos_factura_con_ruc",
  DROP CONSTRAINT IF EXISTS "gastos_ruc_formato",
  DROP COLUMN IF EXISTS "ruc_proveedor",
  DROP COLUMN IF EXISTS "tipo_comprobante";
DROP TYPE IF EXISTS "TipoComprobante";
COMMIT;
