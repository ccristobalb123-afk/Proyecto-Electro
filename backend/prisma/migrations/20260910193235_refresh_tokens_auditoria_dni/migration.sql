/*
  Warnings:

  - A unique constraint covering the columns `[dni]` on the table `personal` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `dni` to the `personal` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "historial_equipo" ADD COLUMN     "usuario_id" INTEGER;

-- AlterTable
ALTER TABLE "historial_vehiculo" ADD COLUMN     "usuario_id" INTEGER;

-- AlterTable
ALTER TABLE "personal" ADD COLUMN     "dni" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "revocado_en" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "personal_dni_key" ON "personal"("dni");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_equipo" ADD CONSTRAINT "historial_equipo_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_vehiculo" ADD CONSTRAINT "historial_vehiculo_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
