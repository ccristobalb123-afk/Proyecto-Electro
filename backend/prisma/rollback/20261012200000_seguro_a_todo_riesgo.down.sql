-- Reversa de 20261012200000_seguro_a_todo_riesgo: vuelve a "sistema
-- anterior" las filas cuyo texto original es "Seguro". Las creadas desde
-- la app tienen el texto "Seguro Contra Todo Riesgo", así que no se tocan.
-- Las fechas, días de aviso y archivos que se les hayan cargado después
-- se conservan.
--
-- Uso (en backend/):
--   psql "$DATABASE_URL" -f prisma/rollback/20261012200000_seguro_a_todo_riesgo.down.sql
--   psql "$DATABASE_URL" -c "DELETE FROM _prisma_migrations WHERE migration_name = '20261012200000_seguro_a_todo_riesgo';"

BEGIN;
UPDATE "documentos_vehiculo"
SET "tipo_documento" = NULL
WHERE "tipo_documento" = 'SEGURO_TODO_RIESGO'
  AND lower(btrim("tipo")) = 'seguro';
COMMIT;
