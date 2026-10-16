-- Tipos de equipo con campos propios (ver src/lib/tiposEquipo.js).
--
-- Estructura (aditiva salvo el código):
--   * categorias_equipo.tipo: clave fija del tipo (NULL = categoría antigua).
--   * equipos: marca, serial, pasos, talla, lote, fecha_fabricacion (NULL).
--   * equipos.codigo pasa a opcional (arnés, línea de vida, eslinga y
--     estrobos se identifican por su serial) y deja de ser único en toda
--     la tabla: ahora es único DENTRO de cada tipo, igual que el serial.
--     Es el único cambio que relaja una restricción existente.
-- Datos:
--   * Se asocia cada categoría existente a su tipo y se crean los tipos
--     que faltan (Arnés, Estrobo de Posicionamiento...). "Estrobo Largo"
--     queda sin tipo: se conserva pero no se ofrece para equipos nuevos.
--   * Marca, Serie, Pasos y Talla de campos_valores (JSON) se COPIAN a las
--     columnas nuevas, solo cuando el tipo pide ese campo. El JSON no se
--     modifica ni se borra.
-- Reversa en prisma/rollback/20261016000000_tipos_equipo.down.sql

-- ---- Estructura ----
ALTER TABLE "categorias_equipo" ADD COLUMN "tipo" TEXT;
CREATE UNIQUE INDEX "categorias_equipo_tipo_key" ON "categorias_equipo"("tipo");

ALTER TABLE "equipos"
  ADD COLUMN "marca" TEXT,
  ADD COLUMN "serial" TEXT,
  ADD COLUMN "pasos" INTEGER,
  ADD COLUMN "talla" TEXT,
  ADD COLUMN "lote" TEXT,
  ADD COLUMN "fecha_fabricacion" DATE,
  ALTER COLUMN "codigo" DROP NOT NULL;

DROP INDEX "equipos_codigo_key";
CREATE UNIQUE INDEX "equipos_categoria_id_codigo_key" ON "equipos"("categoria_id", "codigo");
CREATE UNIQUE INDEX "equipos_categoria_id_serial_key" ON "equipos"("categoria_id", "serial");

-- ---- Categorías existentes -> tipo (por su nombre actual) ----
UPDATE "categorias_equipo" SET "tipo" = v.tipo
FROM (VALUES
  ('Escaleras Embonables', 'ESCALERA_EMBONABLE'), ('Escalera Embonable', 'ESCALERA_EMBONABLE'),
  ('Pinzas Amperimétricas', 'PINZA_AMPERIMETRICA'), ('Pinza Amperimétrica', 'PINZA_AMPERIMETRICA'),
  ('Secuencimetro', 'SECUENCIMETRO'), ('Secuencímetro', 'SECUENCIMETRO'),
  ('Guantes Dieléctricos', 'GUANTES_DIELECTRICOS'),
  ('Arnés', 'ARNES'),
  ('Línea de Vida', 'LINEA_DE_VIDA'),
  ('Eslinga de Anclaje', 'ESLINGA_ANCLAJE'),
  ('Estrobo de Posicionamiento', 'ESTROBO_POSICIONAMIENTO'),
  ('Estrobo Regulable', 'ESTROBO_REGULABLE')
) AS v(nombre, tipo)
WHERE "categorias_equipo"."nombre" = v.nombre
  AND NOT EXISTS (SELECT 1 FROM "categorias_equipo" o WHERE o."tipo" = v.tipo);

-- ---- Tipos que todavía no tienen categoría: se crean ----
INSERT INTO "categorias_equipo" ("nombre", "campos", "tipo")
SELECT v.nombre, '[]'::jsonb, v.tipo
FROM (VALUES
  ('Escalera Embonable', 'ESCALERA_EMBONABLE'),
  ('Pinza Amperimétrica', 'PINZA_AMPERIMETRICA'),
  ('Secuencímetro', 'SECUENCIMETRO'),
  ('Guantes Dieléctricos', 'GUANTES_DIELECTRICOS'),
  ('Arnés', 'ARNES'),
  ('Línea de Vida', 'LINEA_DE_VIDA'),
  ('Eslinga de Anclaje', 'ESLINGA_ANCLAJE'),
  ('Estrobo de Posicionamiento', 'ESTROBO_POSICIONAMIENTO'),
  ('Estrobo Regulable', 'ESTROBO_REGULABLE')
) AS v(nombre, tipo)
WHERE NOT EXISTS (SELECT 1 FROM "categorias_equipo" c WHERE c."tipo" = v.tipo)
  AND NOT EXISTS (SELECT 1 FROM "categorias_equipo" c WHERE c."nombre" = v.nombre);

-- ---- Copiar datos del JSON a las columnas (solo si el tipo pide el campo) ----
UPDATE "equipos" e SET "marca" = NULLIF(btrim(e."campos_valores"->>'Marca'), '')
FROM "categorias_equipo" c
WHERE c."id" = e."categoria_id" AND c."tipo" IS NOT NULL;

UPDATE "equipos" e SET "pasos" = (btrim(e."campos_valores"->>'Pasos'))::integer
FROM "categorias_equipo" c
WHERE c."id" = e."categoria_id" AND c."tipo" = 'ESCALERA_EMBONABLE'
  AND btrim(e."campos_valores"->>'Pasos') ~ '^[0-9]{1,3}$';

UPDATE "equipos" e SET "talla" = NULLIF(upper(btrim(e."campos_valores"->>'Talla')), '')
FROM "categorias_equipo" c
WHERE c."id" = e."categoria_id" AND c."tipo" = 'GUANTES_DIELECTRICOS';

-- Serie -> serial, sin chocar con el índice único: si dos equipos del
-- mismo tipo tuvieran la misma serie, no se copia en ninguno (se pedirá
-- al editarlos).
UPDATE "equipos" e SET "serial" = NULLIF(upper(btrim(e."campos_valores"->>'Serie')), '')
FROM "categorias_equipo" c
WHERE c."id" = e."categoria_id"
  AND c."tipo" IN ('PINZA_AMPERIMETRICA', 'SECUENCIMETRO', 'ARNES', 'LINEA_DE_VIDA', 'ESLINGA_ANCLAJE', 'ESTROBO_POSICIONAMIENTO', 'ESTROBO_REGULABLE')
  AND NOT EXISTS (
    SELECT 1 FROM "equipos" o
    WHERE o."categoria_id" = e."categoria_id" AND o."id" <> e."id"
      AND upper(btrim(o."campos_valores"->>'Serie')) = upper(btrim(e."campos_valores"->>'Serie'))
  );
