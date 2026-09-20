/*
  Warnings:

  - A unique constraint covering the columns `[usuario]` on the table `usuarios` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `usuario` to the `usuarios` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TipoContrato" AS ENUM ('PLAZO_FIJO', 'INDEFINIDO');

-- CreateEnum
CREATE TYPE "EstadoManual" AS ENUM ('RENOVADO', 'TERMINADO');

-- CreateEnum
CREATE TYPE "TipoCurso" AS ENUM ('CURSO', 'FOTOCHECK', 'EMO');

-- CreateEnum
CREATE TYPE "EstadoEquipo" AS ENUM ('DISPONIBLE', 'ASIGNADO', 'MANTENIMIENTO', 'VENCIDO', 'DEBAJA');

-- CreateEnum
CREATE TYPE "TipoUnidad" AS ENUM ('CAMIONETA', 'CAMION', 'MINIVAN', 'GRUA', 'AUTO');

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "usuario" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "personal" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contratos" (
    "id" SERIAL NOT NULL,
    "personal_id" INTEGER NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "tipo" "TipoContrato" NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE NOT NULL,
    "dias_anticipacion" INTEGER NOT NULL DEFAULT 30,
    "estado_manual" "EstadoManual",
    "archivo_nombre" TEXT,
    "archivo_url" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contratos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cursos" (
    "id" SERIAL NOT NULL,
    "personal_id" INTEGER NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "tipo" "TipoCurso" NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_vencimiento" DATE NOT NULL,
    "dias_anticipacion" INTEGER NOT NULL DEFAULT 30,
    "estado_manual" "EstadoManual",
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias_equipo" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "campos" JSONB NOT NULL,

    CONSTRAINT "categorias_equipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipos" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "categoria_id" INTEGER NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "estado" "EstadoEquipo" NOT NULL DEFAULT 'DISPONIBLE',
    "vehiculo_id" INTEGER,
    "campos_valores" JSONB NOT NULL DEFAULT '{}',
    "fotos" JSONB NOT NULL DEFAULT '[]',
    "comentario_mantenimiento" TEXT,
    "motivo_baja" TEXT,
    "ultima_inspeccion" DATE,
    "proxima_inspeccion" DATE,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_equipo" (
    "id" SERIAL NOT NULL,
    "equipo_id" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "tono" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_equipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehiculos" (
    "id" SERIAL NOT NULL,
    "placa" TEXT NOT NULL,
    "tipo_unidad" "TipoUnidad" NOT NULL,
    "empresa_duena_id" INTEGER NOT NULL,
    "empresa_uso_id" INTEGER NOT NULL,
    "cuadrilla" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehiculos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_vehiculo" (
    "id" SERIAL NOT NULL,
    "vehiculo_id" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "fecha_vencimiento" DATE,
    "archivo_nombre" TEXT,
    "archivo_url" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_vehiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_vehiculo" (
    "id" SERIAL NOT NULL,
    "vehiculo_id" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "tono" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_vehiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facturas" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "cliente" TEXT NOT NULL,
    "serie" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "monto_total" DECIMAL(12,2) NOT NULL,
    "fecha_emision" DATE NOT NULL,
    "fecha_vencimiento" DATE NOT NULL,
    "aplica_detraccion" BOOLEAN NOT NULL DEFAULT false,
    "archivo_nombre" TEXT,
    "archivo_url" TEXT,
    "anulada" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos_factura" (
    "id" SERIAL NOT NULL,
    "factura_id" INTEGER NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "fecha" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_factura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facturas_por_pagar" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "proveedor" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "monto_total" DECIMAL(12,2) NOT NULL,
    "fecha_emision" DATE NOT NULL,
    "fecha_vencimiento" DATE NOT NULL,
    "archivo_nombre" TEXT,
    "archivo_url" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facturas_por_pagar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos_factura_por_pagar" (
    "id" SERIAL NOT NULL,
    "factura_por_pagar_id" INTEGER NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "fecha" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_factura_por_pagar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias_gasto" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "categorias_gasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gastos" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "categoria_id" INTEGER NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "fecha" DATE NOT NULL,
    "proveedor" TEXT,
    "trabajador" TEXT,
    "descripcion" TEXT,
    "archivo_nombre" TEXT,
    "archivo_url" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gastos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas_notificadas" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "entidad_id" INTEGER NOT NULL,
    "fecha" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alertas_notificadas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categorias_equipo_nombre_key" ON "categorias_equipo"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "equipos_codigo_key" ON "equipos"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "vehiculos_placa_key" ON "vehiculos"("placa");

-- CreateIndex
CREATE UNIQUE INDEX "facturas_empresa_id_serie_numero_key" ON "facturas"("empresa_id", "serie", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_gasto_nombre_key" ON "categorias_gasto"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "alertas_notificadas_tipo_entidad_id_fecha_key" ON "alertas_notificadas"("tipo", "entidad_id", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_usuario_key" ON "usuarios"("usuario");

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_personal_id_fkey" FOREIGN KEY ("personal_id") REFERENCES "personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cursos" ADD CONSTRAINT "cursos_personal_id_fkey" FOREIGN KEY ("personal_id") REFERENCES "personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cursos" ADD CONSTRAINT "cursos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias_equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_vehiculo_id_fkey" FOREIGN KEY ("vehiculo_id") REFERENCES "vehiculos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_equipo" ADD CONSTRAINT "historial_equipo_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehiculos" ADD CONSTRAINT "vehiculos_empresa_duena_id_fkey" FOREIGN KEY ("empresa_duena_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehiculos" ADD CONSTRAINT "vehiculos_empresa_uso_id_fkey" FOREIGN KEY ("empresa_uso_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_vehiculo" ADD CONSTRAINT "documentos_vehiculo_vehiculo_id_fkey" FOREIGN KEY ("vehiculo_id") REFERENCES "vehiculos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_vehiculo" ADD CONSTRAINT "historial_vehiculo_vehiculo_id_fkey" FOREIGN KEY ("vehiculo_id") REFERENCES "vehiculos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_factura" ADD CONSTRAINT "pagos_factura_factura_id_fkey" FOREIGN KEY ("factura_id") REFERENCES "facturas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas_por_pagar" ADD CONSTRAINT "facturas_por_pagar_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_factura_por_pagar" ADD CONSTRAINT "pagos_factura_por_pagar_factura_por_pagar_id_fkey" FOREIGN KEY ("factura_por_pagar_id") REFERENCES "facturas_por_pagar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias_gasto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
