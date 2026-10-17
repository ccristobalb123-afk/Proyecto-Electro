-- Asignación de equipos a un camión O a una persona, con historial.
--
--   * equipos.personal_id (acepta NULL): la persona asignada. No se puede
--     borrar a una persona que tenga equipos (RESTRICT).
--   * asignaciones_equipo: quién tuvo cada equipo, desde y hasta cuándo.
--   * Dos CHECK en equipos: nunca camión y persona a la vez, y ASIGNADO
--     si y solo si tiene destinatario.
--   * Datos: los equipos en DISPONIBLE que seguían con camión (quedaban
--     así al devolverlos) se liberan; su asignación pasa al historial con
--     "hasta" = momento de esta corrección, y se anota en su hoja de vida.
--     Las asignaciones vigentes (estado ASIGNADO) pasan al historial
--     abiertas. Si hubiera un equipo incoherente en OTRO estado, la
--     migración se detiene sin cambiar nada y lo lista: se revisa a mano.
--   * Las fechas se guardan en UTC, como las escribe Prisma.
-- Reversa en prisma/rollback/20261016200000_asignacion_persona.down.sql

DO $$
DECLARE
  lista TEXT;
BEGIN
  SELECT string_agg(coalesce(e."codigo", e."serial", '#' || e."id") || ' (' || e."estado" || ', '
           || coalesce('camión ' || v."placa", 'sin destinatario') || ')', '; ')
    INTO lista
    FROM "equipos" e LEFT JOIN "vehiculos" v ON v."id" = e."vehiculo_id"
   WHERE (e."estado" NOT IN ('ASIGNADO', 'DISPONIBLE') AND e."vehiculo_id" IS NOT NULL)
      OR (e."estado" = 'ASIGNADO' AND e."vehiculo_id" IS NULL);
  IF lista IS NOT NULL THEN
    RAISE EXCEPTION 'Equipos con asignación incoherente que hay que revisar a mano: %', lista;
  END IF;
END $$;

-- CreateEnum
CREATE TYPE "TipoDestinatario" AS ENUM ('CAMION', 'PERSONA');

-- AlterTable
ALTER TABLE "equipos" ADD COLUMN     "personal_id" INTEGER;

-- CreateTable
CREATE TABLE "asignaciones_equipo" (
    "id" SERIAL NOT NULL,
    "equipo_id" INTEGER NOT NULL,
    "tipo" "TipoDestinatario" NOT NULL,
    "vehiculo_id" INTEGER,
    "personal_id" INTEGER,
    "destinatario" TEXT NOT NULL,
    "desde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hasta" TIMESTAMP(3),
    "motivo_fin" TEXT,

    CONSTRAINT "asignaciones_equipo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "asignaciones_equipo_equipo_id_idx" ON "asignaciones_equipo"("equipo_id");

-- AddForeignKey
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_personal_id_fkey" FOREIGN KEY ("personal_id") REFERENCES "personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_equipo" ADD CONSTRAINT "asignaciones_equipo_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_equipo" ADD CONSTRAINT "asignaciones_equipo_vehiculo_id_fkey" FOREIGN KEY ("vehiculo_id") REFERENCES "vehiculos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_equipo" ADD CONSTRAINT "asignaciones_equipo_personal_id_fkey" FOREIGN KEY ("personal_id") REFERENCES "personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Asignaciones actuales al historial: "desde" = la última línea
-- "Asignado a Camión <placa>" de su hoja de vida (o el alta del equipo).
INSERT INTO "asignaciones_equipo" ("equipo_id", "tipo", "vehiculo_id", "destinatario", "desde", "hasta", "motivo_fin")
SELECT e."id", 'CAMION', v."id", v."placa",
       coalesce((SELECT max(h."creado_en") FROM "historial_equipo" h
                  WHERE h."equipo_id" = e."id" AND h."titulo" = 'Asignado a Camión ' || v."placa"), e."creado_en"),
       CASE WHEN e."estado" = 'DISPONIBLE' THEN (now() AT TIME ZONE 'UTC') END,
       CASE WHEN e."estado" = 'DISPONIBLE' THEN 'Corrección: el equipo estaba Disponible' END
  FROM "equipos" e JOIN "vehiculos" v ON v."id" = e."vehiculo_id";

INSERT INTO "historial_equipo" ("equipo_id", "titulo", "creado_en")
SELECT e."id", 'Asignación liberada (corrección: estaba Disponible con Camión ' || v."placa" || ')', (now() AT TIME ZONE 'UTC')
  FROM "equipos" e JOIN "vehiculos" v ON v."id" = e."vehiculo_id"
 WHERE e."estado" = 'DISPONIBLE';

UPDATE "equipos" SET "vehiculo_id" = NULL WHERE "estado" = 'DISPONIBLE' AND "vehiculo_id" IS NOT NULL;

-- Reglas en la base (además de las del backend).
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_un_solo_destinatario"
  CHECK ("vehiculo_id" IS NULL OR "personal_id" IS NULL);
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_asignado_con_destinatario"
  CHECK (("estado" = 'ASIGNADO') = ("vehiculo_id" IS NOT NULL OR "personal_id" IS NOT NULL));
