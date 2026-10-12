-- Documentos de vehículo: de texto libre a catálogo fijo, con fecha de
-- emisión/inspección y días de anticipación propios.
--
-- Segura: solo AGREGA columnas. La columna original "tipo" (texto) no
-- se modifica, así que nada se pierde y la reversa es directa
-- (ver prisma/rollback/20261012180000_catalogo_documentos_vehiculo.down.sql).

-- CreateEnum
CREATE TYPE "TipoDocumentoVehiculo" AS ENUM ('SOAT', 'REVISION_TECNICA', 'SEGURO_TODO_RIESGO', 'TARJETA_PROPIEDAD', 'HABILITACION_VEHICULAR', 'LUNAS_POLARIZADAS', 'BRAZO_HIDRAULICO');

-- AlterTable
ALTER TABLE "documentos_vehiculo" ADD COLUMN     "dias_anticipacion" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "fecha_emision" DATE,
ADD COLUMN     "tipo_documento" "TipoDocumentoVehiculo";

-- Mapeo de los nombres del sistema anterior al catálogo. Lo que no
-- calza (ej. "Seguro", "Permiso de operación") queda con
-- tipo_documento NULL = "sistema anterior": se sigue viendo, con su
-- archivo y su texto original, hasta que se decida qué hacer.
-- Si un vehículo tuviera 2 filas que mapean al mismo tipo, solo la más
-- antigua se convierte (la otra queda como anterior) para no romper el
-- índice único de abajo.
WITH mapeo AS (
  SELECT id, vehiculo_id,
    CASE lower(btrim(tipo))
      WHEN 'soat'                   THEN 'SOAT'
      WHEN 'revisión técnica'       THEN 'REVISION_TECNICA'
      WHEN 'revision tecnica'       THEN 'REVISION_TECNICA'
      WHEN 'tarjeta de circulación' THEN 'HABILITACION_VEHICULAR'
      WHEN 'tarjeta de circulacion' THEN 'HABILITACION_VEHICULAR'
      WHEN 'habilitación vehicular' THEN 'HABILITACION_VEHICULAR'
      WHEN 'habilitacion vehicular' THEN 'HABILITACION_VEHICULAR'
      WHEN 'tarjeta de propiedad'   THEN 'TARJETA_PROPIEDAD'
      WHEN 'lunas polarizadas'      THEN 'LUNAS_POLARIZADAS'
      WHEN 'brazo hidráulico'       THEN 'BRAZO_HIDRAULICO'
      WHEN 'brazo hidraulico'       THEN 'BRAZO_HIDRAULICO'
      WHEN 'seguro contra todo riesgo' THEN 'SEGURO_TODO_RIESGO'
    END AS nuevo
  FROM "documentos_vehiculo"
),
unicos AS (
  SELECT id, nuevo, row_number() OVER (PARTITION BY vehiculo_id, nuevo ORDER BY id) AS n
  FROM mapeo
  WHERE nuevo IS NOT NULL
)
UPDATE "documentos_vehiculo" d
SET "tipo_documento" = u.nuevo::"TipoDocumentoVehiculo"
FROM unicos u
WHERE d.id = u.id AND u.n = 1;

-- CreateIndex
CREATE UNIQUE INDEX "documentos_vehiculo_vehiculo_id_tipo_documento_key" ON "documentos_vehiculo"("vehiculo_id", "tipo_documento");
