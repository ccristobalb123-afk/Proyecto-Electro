-- Reversa de 20261016200000_asignacion_persona.
--
-- Quita la persona asignada, el historial de asignaciones y los CHECK.
-- Los equipos asignados a una PERSONA vuelven a DISPONIBLE (el código
-- anterior solo conoce camiones); los asignados a camión no cambian.
-- No vuelve a poner el camión a los equipos que la migración liberó
-- (estaban Disponible por error); ese dato queda en el respaldo previo.
--
-- Uso (en backend/), con el código ANTERIOR ya restaurado y PM2 detenido:
--   psql -v ON_ERROR_STOP=1 -f prisma/rollback/20261016200000_asignacion_persona.down.sql   (credenciales por ~/.pgpass)
--   psql -c "DELETE FROM _prisma_migrations WHERE migration_name = '20261016200000_asignacion_persona';"

BEGIN;
ALTER TABLE "equipos" DROP CONSTRAINT IF EXISTS "equipos_asignado_con_destinatario";
ALTER TABLE "equipos" DROP CONSTRAINT IF EXISTS "equipos_un_solo_destinatario";
UPDATE "equipos" SET "estado" = 'DISPONIBLE' WHERE "personal_id" IS NOT NULL;
ALTER TABLE "equipos" DROP CONSTRAINT IF EXISTS "equipos_personal_id_fkey";
ALTER TABLE "equipos" DROP COLUMN IF EXISTS "personal_id";
DROP TABLE IF EXISTS "asignaciones_equipo";
DROP TYPE IF EXISTS "TipoDestinatario";
COMMIT;
