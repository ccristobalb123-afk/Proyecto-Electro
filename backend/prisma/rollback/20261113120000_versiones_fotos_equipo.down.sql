-- Reversa de 20261113120000_versiones_fotos_equipo.
--
-- Solo borra la columna versiones_fotos (se puede volver a calcular desde
-- equipos.fotos). Las fotos no se tocan.
--
-- Uso (en backend/), con el código ANTERIOR ya restaurado y PM2 detenido:
--   psql -v ON_ERROR_STOP=1 -f prisma/rollback/20261113120000_versiones_fotos_equipo.down.sql   (credenciales por ~/.pgpass)
--   psql -c "DELETE FROM _prisma_migrations WHERE migration_name = '20261113120000_versiones_fotos_equipo';"

BEGIN;
ALTER TABLE "equipos" DROP COLUMN IF EXISTS "versiones_fotos";
COMMIT;
