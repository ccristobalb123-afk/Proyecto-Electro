-- Fotos de las inspecciones de equipos ("Actualizar inspección").
--
-- Estructura (aditiva, no modifica datos existentes):
--   * fotos_equipo: cada foto de un equipo guardada UNA vez (por su hash).
--     Las inspecciones y los cambios de fotos la referencian por id; así
--     una foto reemplazada no se borra: queda ligada al historial.
--   * historial_equipo.datos: en inspecciones y cambios de fotos, el tipo
--     de inspección ("interna"), el resultado y los ids de las fotos usadas
--     y reemplazadas. Los registros anteriores quedan con NULL y su título
--     (p. ej. "Inspección externa — Aprobado") no cambia.
-- Las fotos actuales siguen en equipos.fotos (no se tocan).
-- Reversa en prisma/rollback/20261024100000_fotos_inspeccion_equipo.down.sql

ALTER TABLE "historial_equipo" ADD COLUMN "datos" JSONB;

CREATE TABLE "fotos_equipo" (
    "id" SERIAL NOT NULL,
    "equipo_id" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fotos_equipo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fotos_equipo_equipo_id_hash_key" ON "fotos_equipo"("equipo_id", "hash");

ALTER TABLE "fotos_equipo" ADD CONSTRAINT "fotos_equipo_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
