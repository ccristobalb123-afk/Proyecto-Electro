-- Reversa de 20261016000000_tipos_equipo.
--
-- Vuelve a dejar equipos.codigo obligatorio y único en toda la tabla, y
-- quita las columnas nuevas (se pierden Marca/Serial/Pasos/Talla/Lote/
-- Fecha de fabricación cargados con la versión nueva; lo que venía del
-- JSON campos_valores sigue ahí, nunca se tocó). Las categorías creadas
-- por la migración se borran solo si no tienen equipos.
--
-- Se NIEGA a correr (y no cambia nada) si hay equipos sin código o
-- códigos repetidos entre tipos: habría que completarlos antes.
--
-- Uso (en backend/), con el código ANTERIOR ya restaurado y PM2 detenido:
--   psql -v ON_ERROR_STOP=1 -f prisma/rollback/20261016000000_tipos_equipo.down.sql   (credenciales por ~/.pgpass)
--   psql -c "DELETE FROM _prisma_migrations WHERE migration_name = '20261016000000_tipos_equipo';"

BEGIN;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "equipos" WHERE "codigo" IS NULL) THEN
    RAISE EXCEPTION 'Hay equipos sin código (identificados por serial). Ponles un código antes de revertir.';
  END IF;
  IF EXISTS (SELECT "codigo" FROM "equipos" GROUP BY "codigo" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Hay códigos repetidos entre tipos de equipo. Corrígelos antes de revertir.';
  END IF;
END $$;

DROP INDEX IF EXISTS "equipos_categoria_id_codigo_key";
DROP INDEX IF EXISTS "equipos_categoria_id_serial_key";
ALTER TABLE "equipos" ALTER COLUMN "codigo" SET NOT NULL;
CREATE UNIQUE INDEX "equipos_codigo_key" ON "equipos"("codigo");
ALTER TABLE "equipos"
  DROP COLUMN IF EXISTS "marca",
  DROP COLUMN IF EXISTS "serial",
  DROP COLUMN IF EXISTS "pasos",
  DROP COLUMN IF EXISTS "talla",
  DROP COLUMN IF EXISTS "lote",
  DROP COLUMN IF EXISTS "fecha_fabricacion";

DELETE FROM "categorias_equipo" c
WHERE c."nombre" IN ('Arnés', 'Estrobo de Posicionamiento')
  AND jsonb_typeof(c."campos") = 'array' AND jsonb_array_length(c."campos") = 0
  AND NOT EXISTS (SELECT 1 FROM "equipos" e WHERE e."categoria_id" = c."id");

DROP INDEX IF EXISTS "categorias_equipo_tipo_key";
ALTER TABLE "categorias_equipo" DROP COLUMN IF EXISTS "tipo";
COMMIT;
