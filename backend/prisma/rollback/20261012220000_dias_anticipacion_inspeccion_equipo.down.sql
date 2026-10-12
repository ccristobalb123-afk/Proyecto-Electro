-- Reversa de 20261012220000_dias_anticipacion_inspeccion_equipo.
-- Quita la columna: se pierden solo los días de anticipación cargados
-- desde el modal; las fechas de inspección no se tocan.
--
-- Uso (en backend/):
--   psql "$DATABASE_URL" -f prisma/rollback/20261012220000_dias_anticipacion_inspeccion_equipo.down.sql
--   psql "$DATABASE_URL" -c "DELETE FROM _prisma_migrations WHERE migration_name = '20261012220000_dias_anticipacion_inspeccion_equipo';"
-- y volver el código a la versión anterior.

BEGIN;
ALTER TABLE "equipos" DROP COLUMN IF EXISTS "dias_anticipacion_inspeccion";
COMMIT;
