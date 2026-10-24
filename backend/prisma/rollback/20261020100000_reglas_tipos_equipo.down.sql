-- Reversa de 20261020100000_reglas_tipos_equipo.
--
-- Quita las columnas de reglas (destino, varias por destinatario, campos,
-- activo, orden), el índice de nombre sin mayúsculas y el CHECK. No toca
-- equipos ni asignaciones.
--   * Los nombres quedan como los dejó la migración ("Escalera
--     Embonable", "Secuencímetro"...): el código anterior identifica los 9
--     tipos por su columna "tipo", no por el nombre, así que funciona igual.
--   * Los tipos creados desde la app (columna "tipo" vacía) quedan como
--     categorías antiguas: el código anterior los muestra solo si tienen
--     equipos y no los ofrece para registrar equipos nuevos.
--
-- Uso (en backend/), con el código ANTERIOR ya restaurado y PM2 detenido:
--   psql -v ON_ERROR_STOP=1 -f prisma/rollback/20261020100000_reglas_tipos_equipo.down.sql   (credenciales por ~/.pgpass)
--   psql -c "DELETE FROM _prisma_migrations WHERE migration_name = '20261020100000_reglas_tipos_equipo';"

BEGIN;
ALTER TABLE "categorias_equipo" DROP CONSTRAINT IF EXISTS "categorias_equipo_campos_validos";
DROP INDEX IF EXISTS "categorias_equipo_nombre_sin_mayusculas_key";
ALTER TABLE "categorias_equipo"
  DROP COLUMN IF EXISTS "activo",
  DROP COLUMN IF EXISTS "campos_requeridos",
  DROP COLUMN IF EXISTS "destino",
  DROP COLUMN IF EXISTS "orden",
  DROP COLUMN IF EXISTS "varias_por_destinatario";
COMMIT;
