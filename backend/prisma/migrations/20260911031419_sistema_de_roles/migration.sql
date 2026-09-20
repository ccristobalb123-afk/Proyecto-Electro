/*
  Warnings:

  - You are about to drop the column `rol` on the `usuarios` table. All the data in the column will be lost.
  - Added the required column `rol_id` to the `usuarios` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "usuarios" DROP COLUMN "rol",
ADD COLUMN     "rol_id" INTEGER NOT NULL;

-- DropEnum
DROP TYPE "Rol";

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "es_super_admin" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rol_modulos" (
    "id" SERIAL NOT NULL,
    "rol_id" INTEGER NOT NULL,
    "modulo" TEXT NOT NULL,

    CONSTRAINT "rol_modulos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_nombre_key" ON "roles"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "rol_modulos_rol_id_modulo_key" ON "rol_modulos"("rol_id", "modulo");

-- AddForeignKey
ALTER TABLE "rol_modulos" ADD CONSTRAINT "rol_modulos_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
