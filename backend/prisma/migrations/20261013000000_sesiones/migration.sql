-- Sesiones por dispositivo: cierre por inactividad, duración máxima,
-- detección de reutilización de refresh tokens y "cerrar sesión en
-- todos los dispositivos".
-- Aditiva: una tabla nueva y columnas que admiten NULL; no modifica ni
-- borra datos existentes. Los refresh tokens anteriores (sin sesión)
-- dejan de aceptarse en el código nuevo: cada usuario inicia sesión una
-- vez más después del despliegue.
-- Reversa en prisma/rollback/20261013000000_sesiones.down.sql

-- AlterTable
ALTER TABLE "push_subscriptions" ADD COLUMN     "sesion_id" TEXT;

-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "motivo_revocacion" TEXT,
ADD COLUMN     "sesion_id" TEXT;

-- CreateTable
CREATE TABLE "sesiones" (
    "id" TEXT NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultima_actividad_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expira_absoluta_en" TIMESTAMP(3) NOT NULL,
    "revocada_en" TIMESTAMP(3),
    "motivo_cierre" TEXT,
    "user_agent" TEXT,
    "ip" TEXT,

    CONSTRAINT "sesiones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sesiones_usuario_id_idx" ON "sesiones"("usuario_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_sesion_id_idx" ON "refresh_tokens"("sesion_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_sesion_id_fkey" FOREIGN KEY ("sesion_id") REFERENCES "sesiones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_sesion_id_fkey" FOREIGN KEY ("sesion_id") REFERENCES "sesiones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

