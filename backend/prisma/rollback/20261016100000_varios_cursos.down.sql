-- Reversa de 20261016100000_varios_cursos.
--
-- Quita código y nombre de curso y vuelve a la regla anterior de un solo
-- registro por persona, empresa y tipo. Se NIEGA a correr (sin cambiar
-- nada) si alguna persona ya tiene más de un curso en la misma empresa:
-- habría que decidir antes cuáles conservar.
--
-- Uso (en backend/), con el código ANTERIOR ya restaurado y PM2 detenido:
--   psql -v ON_ERROR_STOP=1 -f prisma/rollback/20261016100000_varios_cursos.down.sql   (credenciales por ~/.pgpass)
--   psql -c "DELETE FROM _prisma_migrations WHERE migration_name = '20261016100000_varios_cursos';"

BEGIN;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "cursos" GROUP BY "personal_id", "empresa_id", "tipo" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Hay personas con más de un curso (o EMO) en la misma empresa. Decide cuáles conservar antes de revertir.';
  END IF;
END $$;

DROP INDEX IF EXISTS "cursos_personal_id_codigo_curso_key";
ALTER TABLE "cursos" DROP COLUMN IF EXISTS "codigo_curso", DROP COLUMN IF EXISTS "nombre_curso";
CREATE UNIQUE INDEX "cursos_personal_id_empresa_id_tipo_key" ON "cursos"("personal_id", "empresa_id", "tipo");
COMMIT;
