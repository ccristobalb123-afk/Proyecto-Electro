-- Varios cursos por persona, cada uno con su código y nombre.
--
--   * cursos.codigo_curso y cursos.nombre_curso (aceptan NULL): solo los
--     usa el tipo CURSO. EMO no los lleva, y los cursos registrados antes
--     quedan en NULL (se muestran con "—" y se piden al editarlos).
--   * Se quita la restricción "un solo registro por persona, empresa y
--     tipo" (impedía tener más de un curso) y se reemplaza por "una
--     persona no repite el mismo código de curso". La regla de un solo EMO
--     por persona y empresa la sigue aplicando el backend.
--   * No modifica ni borra datos. Al aplicarla no puede haber códigos
--     repetidos: la columna es nueva y empieza vacía.
-- Reversa en prisma/rollback/20261016100000_varios_cursos.down.sql

DROP INDEX "cursos_personal_id_empresa_id_tipo_key";

ALTER TABLE "cursos"
  ADD COLUMN "codigo_curso" TEXT,
  ADD COLUMN "nombre_curso" TEXT;

CREATE UNIQUE INDEX "cursos_personal_id_codigo_curso_key" ON "cursos"("personal_id", "codigo_curso");
