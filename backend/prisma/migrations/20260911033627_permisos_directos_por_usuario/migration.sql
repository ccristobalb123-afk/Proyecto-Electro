/*
  Warnings:

  - You are about to drop the column `rol_id` on the `usuarios` table. All the data in the column will be lost.
  - You are about to drop the `rol_modulos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `roles` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "rol_modulos" DROP CONSTRAINT "rol_modulos_rol_id_fkey";

-- DropForeignKey
ALTER TABLE "usuarios" DROP CONSTRAINT "usuarios_rol_id_fkey";

-- AlterTable
ALTER TABLE "usuarios" DROP COLUMN "rol_id",
ADD COLUMN     "es_super_admin" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "rol_modulos";

-- DropTable
DROP TABLE "roles";

-- CreateTable
CREATE TABLE "usuario_modulos" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "modulo" TEXT NOT NULL,

    CONSTRAINT "usuario_modulos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_modulos_usuario_id_modulo_key" ON "usuario_modulos"("usuario_id", "modulo");

-- AddForeignKey
ALTER TABLE "usuario_modulos" ADD CONSTRAINT "usuario_modulos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
