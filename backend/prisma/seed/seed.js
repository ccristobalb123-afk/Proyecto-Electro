import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import * as OTPAuth from "otpauth";

const db = new PrismaClient();
const PASSWORD_DEV = "Password123!"; // Todos los usuarios seed usan esta clave.

async function main() {
  const corevex = await db.empresa.upsert({
    where: { slug: "corevex" },
    update: {},
    create: { nombre: "CorevexSAC", slug: "corevex" },
  });
  const electro = await db.empresa.upsert({
    where: { slug: "electro" },
    update: {},
    create: { nombre: "ElectroSAC", slug: "electro" },
  });

  const passwordHash = await bcrypt.hash(PASSWORD_DEV, 12);

  // Si el admin ya existe (ej. estás re-corriendo el seed para
  // recuperar el link otpauth porque se te perdió), hay que reusar SU
  // secreto ya guardado — antes esto generaba uno nuevo random solo
  // para mostrarlo en pantalla, pero como el usuario ya existía, el
  // upsert de abajo no lo guardaba (update: {}), así que el código
  // nunca iba a calzar con lo que de verdad tiene la base de datos.
  const existente = await db.usuario.findUnique({ where: { usuario: "admin" } });
  const secretoAdmin = existente?.mfaSecret || new OTPAuth.Secret({ size: 20 }).base32;

  // esSuperAdmin:true no necesita filas en UsuarioModulo — modulosDe()
  // ya sabe que eso significa "todos los módulos, siempre" (ver
  // lib/roles.js). Los otros 2 son solo ejemplos con el mismo alcance
  // que tenían los antiguos SUPERVISOR/USUARIO — desde Administración
  // se le pueden marcar/desmarcar ventanas a cualquier usuario
  // libremente.
  const admin = await db.usuario.upsert({
    where: { usuario: "admin" },
    update: {},
    create: {
      usuario: "admin",
      correo: "admin@electro.pe",
      passwordHash,
      nombre: "Cristian Corahua",
      esSuperAdmin: true,
      mfaSecret: secretoAdmin,
      mfaHabilitado: true,
      empresas: { create: [{ empresaId: corevex.id }, { empresaId: electro.id }] },
    },
  });

  await db.usuario.upsert({
    where: { usuario: "supervisor" },
    update: {},
    create: {
      usuario: "supervisor",
      correo: "supervisor@electro.pe",
      passwordHash,
      nombre: "Milagros Ríos",
      modulos: { create: [{ modulo: "dashboard" }, { modulo: "rrhh" }, { modulo: "operaciones" }] },
      empresas: { create: [{ empresaId: corevex.id }, { empresaId: electro.id }] },
    },
  });

  await db.usuario.upsert({
    where: { usuario: "usuario1" },
    update: {},
    create: {
      usuario: "usuario1",
      correo: "usuario@electro.pe",
      passwordHash,
      nombre: "Alonso Torres",
      modulos: { create: [{ modulo: "dashboard" }, { modulo: "operaciones" }] },
      empresas: { create: [{ empresaId: corevex.id }] },
    },
  });

  // Fechas relativas a "hoy" (no fijas a 2026) — así vigente/por vencer/
  // vencido siempre tienen sentido, sin importar cuándo se corra el seed.
  // Se usa tanto en RRHH como en Operaciones, por eso vive acá arriba.
  const dias = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d;
  };

  // ---- RRHH: Personal + Contratos + Cursos de ejemplo ----
  // Solo se siembra si todavía no hay ningún contrato — así correr el
  // seed de nuevo no duplica todo cada vez.
  const hayContratos = await db.contrato.count();
  if (hayContratos === 0) {
    const personalSeed = [
      { dni: "45671234", nombre: "J. Ramírez Soto" },
      { dni: "48123456", nombre: "S. Vega Luna" },
      { dni: "44567890", nombre: "Milagros Ríos" },
      { dni: "46789012", nombre: "Alonso Torres" },
      { dni: "47890123", nombre: "Pedro Castañeda" },
      { dni: "49012345", nombre: "Lucía Farfán" },
    ];
    const personal = {};
    for (const { dni, nombre } of personalSeed) {
      personal[nombre] = await db.personal.create({ data: { dni, nombre } });
    }

    await db.contrato.createMany({
      data: [
        { personalId: personal["J. Ramírez Soto"].id, empresaId: corevex.id, tipo: "PLAZO_FIJO", fechaInicio: dias(-300), fechaFin: dias(-10), archivoNombre: "contrato-jramirez.pdf" },
        { personalId: personal["S. Vega Luna"].id, empresaId: electro.id, tipo: "INDEFINIDO", fechaInicio: dias(-200), fechaFin: dias(12), archivoNombre: "contrato-svega.pdf" },
        { personalId: personal["Milagros Ríos"].id, empresaId: corevex.id, tipo: "PLAZO_FIJO", fechaInicio: dias(-90), fechaFin: dias(150), archivoNombre: "contrato-mrios.pdf" },
        { personalId: personal["Alonso Torres"].id, empresaId: electro.id, tipo: "INDEFINIDO", fechaInicio: dias(-400), fechaFin: dias(200), archivoNombre: "contrato-atorres.pdf" },
        { personalId: personal["Pedro Castañeda"].id, empresaId: corevex.id, tipo: "PLAZO_FIJO", fechaInicio: dias(-60), fechaFin: dias(120), estadoManual: "RENOVADO", archivoNombre: "contrato-pcastaneda.pdf" },
        { personalId: personal["Lucía Farfán"].id, empresaId: electro.id, tipo: "PLAZO_FIJO", fechaInicio: dias(-500), fechaFin: dias(-150), estadoManual: "TERMINADO" },
      ],
    });

    await db.curso.createMany({
      data: [
        { personalId: personal["J. Ramírez Soto"].id, empresaId: corevex.id, tipo: "EMO", fechaInicio: dias(-340), fechaVencimiento: dias(-14) },
        { personalId: personal["Milagros Ríos"].id, empresaId: corevex.id, tipo: "FOTOCHECK", fechaInicio: dias(-350), fechaVencimiento: dias(6) },
        { personalId: personal["Alonso Torres"].id, empresaId: electro.id, tipo: "CURSO", fechaInicio: dias(-30), fechaVencimiento: dias(150) },
      ],
    });

    console.log(" RRHH sembrado: 6 personal, 6 contratos, 3 cursos.");
  }

  // ---- Operaciones: Categorías + Equipos + Vehículos de ejemplo ----
  const hayCategorias = await db.categoriaEquipo.count();
  if (hayCategorias === 0) {
    const CATEGORIAS = {
      "Escaleras Embonables": [
        { nombre: "Serie", placeholder: "Ej. SC-2201" },
        { nombre: "Marca", placeholder: "Ej. Escalerín Pro" },
        { nombre: "Pasos", placeholder: "Ej. 8" },
      ],
      "Guantes Dieléctricos": [
        { nombre: "Serie", placeholder: "Ej. GD-0091" },
        { nombre: "Clase", placeholder: "Ej. Clase 0" },
        { nombre: "Talla", placeholder: "Ej. M" },
      ],
      "Pinzas Amperimétricas": [
        { nombre: "Serie", placeholder: "Ej. PA-118" },
        { nombre: "Marca", placeholder: "Ej. Fluke" },
      ],
      "Línea de Vida": [
        { nombre: "Serie", placeholder: "Ej. LV-3310" },
        { nombre: "Longitud (m)", placeholder: "Ej. 1.8" },
      ],
      "Estrobo Regulable": [
        { nombre: "Serie", placeholder: "Ej. ER-4410" },
        { nombre: "Longitud (m)", placeholder: "Ej. 1.2" },
        { nombre: "Capacidad (kg)", placeholder: "Ej. 100" },
      ],
      "Estrobo Largo": [
        { nombre: "Serie", placeholder: "Ej. EL-5510" },
        { nombre: "Longitud (m)", placeholder: "Ej. 1.8" },
        { nombre: "Capacidad (kg)", placeholder: "Ej. 100" },
      ],
      "Eslinga de Anclaje": [
        { nombre: "Serie", placeholder: "Ej. EA-6610" },
        { nombre: "Longitud (m)", placeholder: "Ej. 1.5" },
      ],
    };
    const categoriaRows = {};
    for (const [nombre, campos] of Object.entries(CATEGORIAS)) {
      categoriaRows[nombre] = await db.categoriaEquipo.create({ data: { nombre, campos } });
    }

    const vehiculo1 = await db.vehiculo.create({
      data: {
        placa: "ABC-123",
        tipoUnidad: "CAMION",
        empresaDuenaId: corevex.id,
        empresaUsoId: corevex.id,
        cuadrilla: "Cuadrilla Yerson H.",
        documentos: {
          create: [
            { tipo: "SOAT", fechaVencimiento: dias(22), archivoNombre: "soat-abc123.pdf" },
            { tipo: "Revisión técnica", fechaVencimiento: dias(95), archivoNombre: "revision-abc123.pdf" },
            { tipo: "Tarjeta de circulación", fechaVencimiento: dias(210), archivoNombre: "tarjeta-abc123.pdf" },
            { tipo: "Seguro", fechaVencimiento: dias(5) },
            { tipo: "Permiso de operación", fechaVencimiento: dias(150), archivoNombre: "permiso-abc123.pdf" },
          ],
        },
      },
    });
    await db.historialVehiculo.create({ data: { vehiculoId: vehiculo1.id, titulo: "Registrado en el sistema" } });

    const vehiculo2 = await db.vehiculo.create({
      data: {
        placa: "DEF-456",
        tipoUnidad: "GRUA",
        empresaDuenaId: electro.id,
        empresaUsoId: corevex.id,
        cuadrilla: "Proyecto Tecsur — LDS",
        documentos: {
          create: [
            { tipo: "SOAT", fechaVencimiento: dias(60), archivoNombre: "soat-def456.pdf" },
            { tipo: "Revisión técnica", fechaVencimiento: dias(60), archivoNombre: "revision-def456.pdf" },
            { tipo: "Tarjeta de circulación", fechaVencimiento: dias(60), archivoNombre: "tarjeta-def456.pdf" },
            { tipo: "Seguro", fechaVencimiento: dias(60), archivoNombre: "seguro-def456.pdf" },
            { tipo: "Permiso de operación", fechaVencimiento: dias(60), archivoNombre: "permiso-def456.pdf" },
            { tipo: "Brazo hidráulico", fechaVencimiento: dias(40), archivoNombre: "brazo-def456.pdf" },
          ],
        },
      },
    });
    await db.historialVehiculo.create({ data: { vehiculoId: vehiculo2.id, titulo: "Registrado en el sistema" } });

    const equipo1 = await db.equipo.create({
      data: {
        codigo: "PP-ESC-EMB-009",
        categoriaId: categoriaRows["Escaleras Embonables"].id,
        empresaId: corevex.id,
        estado: "ASIGNADO",
        vehiculoId: vehiculo1.id,
        camposValores: { Pasos: "8" },
        proximaInspeccion: dias(150),
      },
    });
    await db.historialEquipo.create({ data: { equipoId: equipo1.id, titulo: "Registrado en el sistema" } });
    await db.historialEquipo.create({ data: { equipoId: equipo1.id, titulo: "Asignado a Camión ABC-123", tono: "success" } });

    const equipo2 = await db.equipo.create({
      data: {
        codigo: "EQ-GD-021",
        categoriaId: categoriaRows["Guantes Dieléctricos"].id,
        empresaId: electro.id,
        estado: "VENCIDO",
        camposValores: { Clase: "Clase 0", Talla: "M" },
      },
    });
    await db.historialEquipo.create({ data: { equipoId: equipo2.id, titulo: "Registrado en el sistema" } });

    const equipo3 = await db.equipo.create({
      data: {
        codigo: "EQ-ER-072",
        categoriaId: categoriaRows["Estrobo Regulable"].id,
        empresaId: corevex.id,
        estado: "MANTENIMIENTO",
        camposValores: { "Longitud (m)": "1.2", "Capacidad (kg)": "100" },
        comentarioMantenimiento: "Cable deshilachado en el mosquetón.",
      },
    });
    await db.historialEquipo.create({ data: { equipoId: equipo3.id, titulo: "Registrado en el sistema" } });
    await db.historialEquipo.create({ data: { equipoId: equipo3.id, titulo: "Enviado a mantenimiento", tono: "volt" } });

    const equipo4 = await db.equipo.create({
      data: {
        codigo: "EQ-PA-039",
        categoriaId: categoriaRows["Pinzas Amperimétricas"].id,
        empresaId: electro.id,
        estado: "DEBAJA",
        motivoBaja: "Desgaste irreversible.",
        camposValores: { Marca: "Fluke" },
      },
    });
    await db.historialEquipo.create({ data: { equipoId: equipo4.id, titulo: "Registrado en el sistema" } });
    await db.historialEquipo.create({ data: { equipoId: equipo4.id, titulo: "Dado de baja — Desgaste irreversible." } });

    await db.equipo.create({
      data: {
        codigo: "EQ-LV-058",
        categoriaId: categoriaRows["Línea de Vida"].id,
        empresaId: corevex.id,
        estado: "DISPONIBLE",
        camposValores: { "Longitud (m)": "1.8" },
      },
    });

    console.log(" Operaciones sembrado: 7 categorías, 5 equipos, 2 vehículos.");
  }

  // ---- Catálogo de detracción (SUNAT R.S. 183-2004 y modificatorias) ----
  const hayCatalogoDetraccion = await db.catalogoDetraccion.count();
  if (hayCatalogoDetraccion === 0) {
    const codigosDetraccion = [
      { codigo: "030", descripcion: "Contratos de construcción", anexo: 3, porcentaje: 0.04, montoMinimo: 700 },
      { codigo: "019", descripcion: "Arrendamiento de bienes muebles e inmuebles", anexo: 3, porcentaje: 0.10, montoMinimo: 700 },
      { codigo: "020", descripcion: "Contratos de fabricación por encargo", anexo: 3, porcentaje: 0.10, montoMinimo: 700 },
      { codigo: "021", descripcion: "Intermediación laboral y tercerización", anexo: 3, porcentaje: 0.12, montoMinimo: 700 },
      { codigo: "034", descripcion: "Transporte de bienes por vía terrestre", anexo: 3, porcentaje: 0.04, montoMinimo: 400 },
      { codigo: "037", descripcion: "Demás servicios gravados con IGV (mantenimiento de bienes muebles, etc.)", anexo: 3, porcentaje: 0.12, montoMinimo: 700 },
    ];
    await db.catalogoDetraccion.createMany({
      data: codigosDetraccion.map((c) => ({ ...c, vigenteDesde: dias(-3650) })),
    });
    console.log(" Catálogo de detracción sembrado.");
  }
  const catPorCodigo = Object.fromEntries((await db.catalogoDetraccion.findMany()).map((c) => [c.codigo, c]));

  // ---- Finanzas: categorías de gasto + facturas + gastos de ejemplo ----
  const hayCategoriasGasto = await db.categoriaGasto.count();
  if (hayCategoriasGasto === 0) {
    await db.categoriaGasto.createMany({
      data: ["Combustible", "Mantenimiento", "Bono", "Alquiler", "Otro/Varios"].map((nombre) => ({ nombre })),
    });
    console.log(" Categorías de gasto sembradas.");
  }

  const hayFacturas = await db.factura.count();
  if (hayFacturas === 0) {
    const f1 = await db.factura.create({
      data: {
        empresaId: corevex.id, cliente: "Tecsur S.A.", serie: "F001", numero: "00821",
        montoTotal: 4720, fechaEmision: dias(-30), fechaVencimiento: dias(1),
        catalogoDetraccionId: catPorCodigo["030"].id,
        montoDetraccion: Math.round(4720 * Number(catPorCodigo["030"].porcentaje) * 100) / 100,
        archivoNombre: "factura-f001-00821.pdf",
      },
    });
    await db.pagoFactura.create({ data: { facturaId: f1.id, monto: 2000, fecha: dias(-15) } });

    await db.factura.create({
      data: {
        empresaId: electro.id, cliente: "Luz del Sur", serie: "F001", numero: "00822",
        montoTotal: 2360, fechaEmision: dias(-25), fechaVencimiento: dias(-5),
      },
    });

    const f3 = await db.factura.create({
      data: {
        empresaId: corevex.id, cliente: "Coopsol", serie: "F002", numero: "00104",
        montoTotal: 8850, fechaEmision: dias(-40), fechaVencimiento: dias(-10),
        catalogoDetraccionId: catPorCodigo["030"].id,
        montoDetraccion: Math.round(8850 * Number(catPorCodigo["030"].porcentaje) * 100) / 100,
        archivoNombre: "factura-f002-00104.pdf",
      },
    });
    // Antes pagaba 8850 (el bruto) y quedaba "pagado". Con detracción,
    // el neto real es 8850 - 354 = 8496 — pagar el bruto completo ya no
    // tiene sentido, se estaría "pagando" lo que en realidad fue a SUNAT.
    await db.pagoFactura.create({ data: { facturaId: f3.id, monto: 8496, fecha: dias(-20) } });

    const fp1 = await db.facturaPorPagar.create({
      data: {
        empresaId: corevex.id, proveedor: "Repuestos Lima SAC", motivo: "Repuestos camión ABC-123",
        montoTotal: 1350, fechaEmision: dias(-20), fechaVencimiento: dias(3),
        archivoNombre: "op-repuestos-lima.pdf",
      },
    });

    const fp2 = await db.facturaPorPagar.create({
      data: {
        empresaId: electro.id, proveedor: "Ferretería El Tornillo", motivo: "Materiales varios",
        montoTotal: 640, fechaEmision: dias(-15), fechaVencimiento: dias(-2),
      },
    });
    await db.pagoFacturaPorPagar.create({ data: { facturaPorPagarId: fp2.id, monto: 640, fecha: dias(-6) } });

    // Caso real que motivó este cambio: servicio tercerizado con
    // detracción del lado de "por pagar" — antes este módulo no tenía
    // ningún campo de detracción, ni siquiera el booleano que sí tenía Factura.
    await db.facturaPorPagar.create({
      data: {
        empresaId: electro.id, proveedor: "Contratista BT del Sur SAC", motivo: "Servicio tercerizado mantenimiento BT",
        montoTotal: 59412.75, fechaEmision: dias(-35), fechaVencimiento: dias(-13),
        catalogoDetraccionId: catPorCodigo["030"].id,
        montoDetraccion: Math.round(59412.75 * Number(catPorCodigo["030"].porcentaje) * 100) / 100,
        detraccionMedioPago: "Depósito en cuenta",
        detraccionCuentaBn: "00099098309",
        archivoNombre: "factura-mantenimiento-bt.pdf",
      },
    });

    const catCombustible = await db.categoriaGasto.findUnique({ where: { nombre: "Combustible" } });
    const catBono = await db.categoriaGasto.findUnique({ where: { nombre: "Bono" } });
    const catMantenimiento = await db.categoriaGasto.findUnique({ where: { nombre: "Mantenimiento" } });

    await db.gasto.createMany({
      data: [
        { empresaId: corevex.id, categoriaId: catCombustible.id, monto: 380, fecha: dias(-8), proveedor: "Grifo Primax", archivoNombre: "gasto-grifo.pdf" },
        { empresaId: electro.id, categoriaId: catBono.id, monto: 200, fecha: dias(-10), trabajador: "Milagros Ríos" },
        { empresaId: corevex.id, categoriaId: catMantenimiento.id, monto: 520, fecha: dias(-11), proveedor: "Taller JR", descripcion: "Cambio de aceite grúa", archivoNombre: "gasto-taller-jr.pdf" },
      ],
    });

    console.log(" Finanzas sembrado: 3 facturas, 3 facturas por pagar, 3 gastos.");
  }

  const totp = new OTPAuth.TOTP({
    issuer: "Activo360",
    label: admin.usuario,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretoAdmin),
  });

  console.log("\n Usuarios de prueba creados. Contraseña para los 3:", PASSWORD_DEV);
  console.log("   usuario: admin        (SuperAdmin, pide MFA)");
  console.log("   usuario: supervisor   (Supervisor)");
  console.log("   usuario: usuario1     (Usuario)");
  console.log("\n Para probar el login del admin, escanea este QR con Google Authenticator/Authy:");
  console.log("   " + totp.toString());
  console.log("   (o pega esa URL en https://totp.danhersam.com/ para generar el código a mano)\n");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
