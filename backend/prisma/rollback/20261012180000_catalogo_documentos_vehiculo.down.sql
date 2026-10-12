-- Reversa de 20261012180000_catalogo_documentos_vehiculo.
-- La columna original "tipo" nunca se modificó: al quitar las nuevas,
-- los documentos vuelven exactamente a como estaban. Se pierden solo
-- los datos que únicamente existen en las columnas nuevas (fecha de
-- emisión y días de anticipación) y las filas creadas después con el
-- catálogo nuevo conservan su nombre en "tipo".
--
-- Uso (en backend/):
--   psql "$DATABASE_URL" -f prisma/rollback/20261012180000_catalogo_documentos_vehiculo.down.sql
--   psql "$DATABASE_URL" -c "DELETE FROM _prisma_migrations WHERE migration_name = '20261012180000_catalogo_documentos_vehiculo';"
-- y volver el código a la versión anterior.

BEGIN;
DROP INDEX IF EXISTS "documentos_vehiculo_vehiculo_id_tipo_documento_key";
ALTER TABLE "documentos_vehiculo"
  DROP COLUMN IF EXISTS "tipo_documento",
  DROP COLUMN IF EXISTS "fecha_emision",
  DROP COLUMN IF EXISTS "dias_anticipacion";
DROP TYPE IF EXISTS "TipoDocumentoVehiculo";
COMMIT;
