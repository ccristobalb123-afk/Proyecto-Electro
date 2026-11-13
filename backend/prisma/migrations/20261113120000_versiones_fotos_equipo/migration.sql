-- Versión de cada foto actual del equipo en su propia columna.
--
-- Los listados (Operaciones, búsqueda, Asignaciones, alertas, KPIs) solo
-- necesitan el ?v= de la URL de cada foto, pero para calcularlo leían
-- equipos.fotos entera (las 2 fotos en base64, ~22 MB con 33 equipos):
-- ~0,5 s por petición. Ahora leen versiones_fotos.
--
-- Estructura (aditiva): una columna TEXT[] con la versión de cada foto en
-- la misma posición que en equipos.fotos ("" donde no hay foto). Nada más
-- del esquema cambia; equipos.fotos no se toca.
--
-- Relleno: la versión es la misma que calculaba la app, los 12 primeros
-- caracteres hex del sha256 del texto de la foto (versionFoto en
-- src/lib/fotosEquipo.js), así las URLs no cambian y no se invalida la
-- caché de miniaturas ni la del navegador.
-- Reversa en prisma/rollback/20261113120000_versiones_fotos_equipo.down.sql

ALTER TABLE "equipos" ADD COLUMN     "versiones_fotos" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "equipos" e
SET "versiones_fotos" = COALESCE((
  SELECT array_agg(
           CASE WHEN jsonb_typeof(f.valor) = 'string' AND f.valor #>> '{}' <> ''
                THEN left(encode(sha256(convert_to(f.valor #>> '{}', 'UTF8')), 'hex'), 12)
                ELSE '' END
           ORDER BY f.posicion)
  FROM jsonb_array_elements(e."fotos") WITH ORDINALITY AS f(valor, posicion)
), ARRAY[]::TEXT[])
WHERE jsonb_typeof(e."fotos") = 'array';
