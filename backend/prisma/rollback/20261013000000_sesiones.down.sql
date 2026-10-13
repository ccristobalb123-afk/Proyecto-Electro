-- Reversa de 20261013000000_sesiones.
-- Quita la tabla de sesiones y las columnas nuevas. Los refresh tokens y
-- las suscripciones push se conservan (solo pierden el vínculo con la
-- sesión); conviene revocar los tokens para que todos inicien sesión de
-- nuevo con el código anterior.
--
-- Uso (en backend/), con el código ANTERIOR ya restaurado y PM2 detenido:
--   psql -f prisma/rollback/20261013000000_sesiones.down.sql   (credenciales por ~/.pgpass)
--   psql -c "DELETE FROM _prisma_migrations WHERE migration_name = '20261013000000_sesiones';"

BEGIN;
ALTER TABLE "push_subscriptions" DROP CONSTRAINT IF EXISTS "push_subscriptions_sesion_id_fkey";
ALTER TABLE "refresh_tokens" DROP CONSTRAINT IF EXISTS "refresh_tokens_sesion_id_fkey";
DROP INDEX IF EXISTS "refresh_tokens_sesion_id_idx";
ALTER TABLE "push_subscriptions" DROP COLUMN IF EXISTS "sesion_id";
ALTER TABLE "refresh_tokens" DROP COLUMN IF EXISTS "sesion_id";
ALTER TABLE "refresh_tokens" DROP COLUMN IF EXISTS "motivo_revocacion";
DROP TABLE IF EXISTS "sesiones";
UPDATE "refresh_tokens" SET "revocado_en" = now() WHERE "revocado_en" IS NULL;
COMMIT;
