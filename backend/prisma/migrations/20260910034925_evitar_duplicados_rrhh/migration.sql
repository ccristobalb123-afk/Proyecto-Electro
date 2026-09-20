/*
  Warnings:

  - A unique constraint covering the columns `[personal_id,empresa_id,tipo]` on the table `contratos` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[personal_id,empresa_id,tipo]` on the table `cursos` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "contratos_personal_id_empresa_id_tipo_key" ON "contratos"("personal_id", "empresa_id", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "cursos_personal_id_empresa_id_tipo_key" ON "cursos"("personal_id", "empresa_id", "tipo");
