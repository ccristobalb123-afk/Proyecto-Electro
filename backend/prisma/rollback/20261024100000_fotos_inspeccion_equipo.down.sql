-- Reversa de 20261024100000_fotos_inspeccion_equipo.
--
-- ATENCIÓN: borra las fotos guardadas para el historial (fotos_equipo),
-- incluidas las fotos REEMPLAZADAS en inspecciones, y el detalle de cada
-- inspección (historial_equipo.datos). Las fotos actuales de cada equipo
-- (equipos.fotos) y los títulos del historial no cambian. Si hay que
-- conservar las fotos reemplazadas, sácalas antes con:
--   psql -c "\copy (SELECT id, equipo_id, creado_en, data FROM fotos_equipo) TO 'fotos_equipo.csv' CSV HEADER"
--
-- Uso (en backend/), con el código ANTERIOR ya restaurado y PM2 detenido:
--   psql -v ON_ERROR_STOP=1 -f prisma/rollback/20261024100000_fotos_inspeccion_equipo.down.sql   (credenciales por ~/.pgpass)
--   psql -c "DELETE FROM _prisma_migrations WHERE migration_name = '20261024100000_fotos_inspeccion_equipo';"

BEGIN;
DROP TABLE IF EXISTS "fotos_equipo";
ALTER TABLE "historial_equipo" DROP COLUMN IF EXISTS "datos";
COMMIT;
