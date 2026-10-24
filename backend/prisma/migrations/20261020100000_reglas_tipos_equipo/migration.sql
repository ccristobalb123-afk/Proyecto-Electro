-- Reglas de cada tipo de equipo en la base (antes fijas en
-- src/lib/tiposEquipo.js), configurables desde Operaciones > Equipos >
-- "Tipos de equipo".
--
-- Estructura (aditiva):
--   * categorias_equipo.destino: CAMION o PERSONA (a quién se asigna).
--   * categorias_equipo.varias_por_destinatario: si una persona o camión
--     puede tener más de uno de ese tipo (solo Escalera Embonable).
--   * categorias_equipo.campos_requeridos: datos que pide el tipo, en el
--     orden en que se muestran (las fechas de inspección y vencimiento se
--     piden siempre y no se guardan acá). Vacío = categoría heredada.
--   * categorias_equipo.activo y categorias_equipo.orden.
--   * Nombre único sin distinguir mayúsculas (índice sobre lower(nombre)).
--   * CHECK: los campos solo pueden ser los conocidos y, si hay alguno,
--     debe estar Código o Serial (para identificar al equipo).
-- Datos:
--   * Los 9 tipos reciben EXACTAMENTE los campos que tenían en
--     tiposEquipo.js, su destino y su orden.
--   * Las categorías sin tipo ("Estrobo Largo") quedan heredadas:
--     destino Persona, sin campos, desactivadas (como hasta ahora, no se
--     ofrecen para equipos nuevos).
--   * Los nombres de la base pasan al nombre que ya mostraba la app
--     ("Escaleras Embonables" -> "Escalera Embonable", "Secuencimetro" ->
--     "Secuencímetro"...), salvo que otro tipo ya se llame así.
--   * No se toca ningún equipo ni asignación.
-- Reversa en prisma/rollback/20261020100000_reglas_tipos_equipo.down.sql

-- ---- Estructura ----
ALTER TABLE "categorias_equipo"
  ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "campos_requeridos" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "destino" "TipoDestinatario",
  ADD COLUMN "orden" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "varias_por_destinatario" BOOLEAN NOT NULL DEFAULT false;

-- ---- Reglas de los 9 tipos (las de tiposEquipo.js) ----
UPDATE "categorias_equipo" c SET
  "destino" = v.destino::"TipoDestinatario",
  "varias_por_destinatario" = v.varias,
  "campos_requeridos" = v.campos,
  "orden" = v.orden,
  "activo" = true
FROM (VALUES
  ('ESCALERA_EMBONABLE',      1, 'CAMION',  true,  ARRAY['codigo', 'marca', 'pasos']),
  ('PINZA_AMPERIMETRICA',     2, 'CAMION',  false, ARRAY['codigo', 'marca', 'serial']),
  ('SECUENCIMETRO',           3, 'CAMION',  false, ARRAY['codigo', 'marca', 'serial']),
  ('GUANTES_DIELECTRICOS',    4, 'PERSONA', false, ARRAY['codigo', 'marca', 'talla']),
  ('ARNES',                   5, 'PERSONA', false, ARRAY['marca', 'serial', 'lote', 'fechaFabricacion']),
  ('LINEA_DE_VIDA',           6, 'PERSONA', false, ARRAY['marca', 'serial', 'lote', 'fechaFabricacion']),
  ('ESLINGA_ANCLAJE',         7, 'PERSONA', false, ARRAY['marca', 'serial', 'lote', 'fechaFabricacion']),
  ('ESTROBO_POSICIONAMIENTO', 8, 'PERSONA', false, ARRAY['marca', 'serial', 'lote', 'fechaFabricacion']),
  ('ESTROBO_REGULABLE',       9, 'PERSONA', false, ARRAY['marca', 'serial', 'lote', 'fechaFabricacion'])
) AS v(tipo, orden, destino, varias, campos)
WHERE c."tipo" = v.tipo;

-- ---- Categorías sin tipo (heredadas, p. ej. "Estrobo Largo") ----
UPDATE "categorias_equipo" SET
  "destino" = 'PERSONA',
  "campos_requeridos" = ARRAY[]::TEXT[],
  "activo" = false,
  "orden" = 100 + "id"
WHERE "tipo" IS NULL;

ALTER TABLE "categorias_equipo" ALTER COLUMN "destino" SET NOT NULL;

-- ---- Nombre de la base = nombre que ya mostraba la app ----
UPDATE "categorias_equipo" c SET "nombre" = v.nombre
FROM (VALUES
  ('ESCALERA_EMBONABLE', 'Escalera Embonable'),
  ('PINZA_AMPERIMETRICA', 'Pinza Amperimétrica'),
  ('SECUENCIMETRO', 'Secuencímetro'),
  ('GUANTES_DIELECTRICOS', 'Guantes Dieléctricos'),
  ('ARNES', 'Arnés'),
  ('LINEA_DE_VIDA', 'Línea de Vida'),
  ('ESLINGA_ANCLAJE', 'Eslinga de Anclaje'),
  ('ESTROBO_POSICIONAMIENTO', 'Estrobo de Posicionamiento'),
  ('ESTROBO_REGULABLE', 'Estrobo Regulable')
) AS v(tipo, nombre)
WHERE c."tipo" = v.tipo
  AND c."nombre" <> v.nombre
  AND NOT EXISTS (SELECT 1 FROM "categorias_equipo" o WHERE o."id" <> c."id" AND lower(o."nombre") = lower(v.nombre));

-- ---- Restricciones ----
CREATE UNIQUE INDEX "categorias_equipo_nombre_sin_mayusculas_key" ON "categorias_equipo" (lower("nombre"));

ALTER TABLE "categorias_equipo" ADD CONSTRAINT "categorias_equipo_campos_validos" CHECK (
  "campos_requeridos" IS NULL
  OR (
    "campos_requeridos" <@ ARRAY['codigo', 'marca', 'pasos', 'serial', 'talla', 'lote', 'fechaFabricacion']::TEXT[]
    AND (cardinality("campos_requeridos") = 0 OR "campos_requeridos" && ARRAY['codigo', 'serial']::TEXT[])
  )
);
