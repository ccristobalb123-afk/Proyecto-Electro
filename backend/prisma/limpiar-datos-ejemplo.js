// Borra SOLO los datos de ejemplo que trajo el seed — nunca toca:
// Empresa, CatalogoDetraccion, CategoriaEquipo, CategoriaGasto, ni
// ningún Usuario. Corre todo dentro de una transacción: si algo
// falla, no se borra nada.
//
// Uso: node prisma/limpiar-datos-ejemplo.js

import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  const resultado = await db.$transaction(async (tx) => {
    const pagosFactura = await tx.pagoFactura.deleteMany({});
    const pagosFacturaPagar = await tx.pagoFacturaPorPagar.deleteMany({});
    const facturas = await tx.factura.deleteMany({});
    const facturasPorPagar = await tx.facturaPorPagar.deleteMany({});
    const gastos = await tx.gasto.deleteMany({});

    // El historial de equipo/vehículo se borra solo (onDelete: Cascade
    // hacia Equipo/Vehiculo), pero se listan aparte igual para el conteo.
    const historialEquipo = await tx.historialEquipo.deleteMany({});
    const equipos = await tx.equipo.deleteMany({});

    const documentosVehiculo = await tx.documentoVehiculo.deleteMany({});
    const historialVehiculo = await tx.historialVehiculo.deleteMany({});
    const vehiculos = await tx.vehiculo.deleteMany({});

    // Contrato y Curso van ANTES que Personal, porque referencian a
    // Personal y no se pueden borrar solos con Personal todavía ahí.
    const contratos = await tx.contrato.deleteMany({});
    const cursos = await tx.curso.deleteMany({});
    const personal = await tx.personal.deleteMany({});

    const alertas = await tx.alertaNotificada.deleteMany({});

    return {
      pagosFactura: pagosFactura.count,
      pagosFacturaPagar: pagosFacturaPagar.count,
      facturas: facturas.count,
      facturasPorPagar: facturasPorPagar.count,
      gastos: gastos.count,
      historialEquipo: historialEquipo.count,
      equipos: equipos.count,
      documentosVehiculo: documentosVehiculo.count,
      historialVehiculo: historialVehiculo.count,
      vehiculos: vehiculos.count,
      contratos: contratos.count,
      cursos: cursos.count,
      personal: personal.count,
      alertas: alertas.count,
    };
  });

  console.log("Datos de ejemplo eliminados:");
  console.table(resultado);
  console.log("\nSe conservaron intactos: Empresas, catálogo de detracción, categorías de equipo/gasto, y todos los usuarios.");
}

main()
  .catch((err) => {
    console.error("Error — no se borró nada (la transacción se revirtió):", err.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
