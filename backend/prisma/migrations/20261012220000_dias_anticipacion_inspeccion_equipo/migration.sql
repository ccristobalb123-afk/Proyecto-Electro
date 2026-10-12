-- Inspecciones de equipo: días de anticipación propios (antes se usaban
-- 15 fijos y el valor del modal se descartaba).
-- Aditiva: una columna nueva con DEFAULT 15, así los equipos existentes
-- quedan con el mismo comportamiento de antes. Reversa en
-- prisma/rollback/20261012220000_dias_anticipacion_inspeccion_equipo.down.sql

-- AlterTable
ALTER TABLE "equipos" ADD COLUMN     "dias_anticipacion_inspeccion" INTEGER NOT NULL DEFAULT 15;
