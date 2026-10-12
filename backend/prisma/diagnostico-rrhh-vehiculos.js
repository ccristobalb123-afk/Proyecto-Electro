// Diagnóstico de SOLO LECTURA (no modifica nada) para los cambios de
// RRHH (Fotocheck, empresa de Cursos/EMO) y del catálogo de documentos
// de vehículo. Sirve antes y después de la migración
// 20261012180000_catalogo_documentos_vehiculo.
//
// Uso (en backend/): node prisma/diagnostico-rrhh-vehiculos.js

import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  // ---- RRHH ----
  const porTipo = await db.$queryRaw`SELECT tipo::text AS tipo, count(*)::int AS n FROM cursos GROUP BY tipo ORDER BY tipo`;
  console.log("Cursos por tipo:", porTipo.length ? porTipo.map((r) => `${r.tipo}=${r.n}`).join(", ") : "(ninguno)");

  const sinContrato = await db.$queryRaw`
    SELECT c.id, c.tipo::text AS tipo, p.nombre, e.slug AS empresa
    FROM cursos c
    JOIN personal p ON p.id = c.personal_id
    JOIN empresas e ON e.id = c.empresa_id
    WHERE NOT EXISTS (
      SELECT 1 FROM contratos k WHERE k.personal_id = c.personal_id AND k.empresa_id = c.empresa_id
    )
    ORDER BY c.id`;
  console.log(`Cursos/EMO cuya empresa no coincide con ningún contrato: ${sinContrato.length}`);
  for (const c of sinContrato) console.log(`  - #${c.id} ${c.tipo} · ${c.nombre} · ${c.empresa}`);

  // ---- Documentos de vehículo ----
  const columnas = await db.$queryRaw`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'documentos_vehiculo' AND column_name = 'tipo_documento'`;
  const migrado = columnas.length > 0;
  console.log(`\nDocumentos de vehículo (${migrado ? "después" : "antes"} de la migración):`);
  const docs = migrado
    ? await db.$queryRaw`
        SELECT tipo, tipo_documento::text AS nuevo, count(*)::int AS n,
               count(archivo_url)::int AS con_archivo, count(fecha_vencimiento)::int AS con_fecha
        FROM documentos_vehiculo GROUP BY tipo, tipo_documento ORDER BY tipo`
    : await db.$queryRaw`
        SELECT tipo, NULL AS nuevo, count(*)::int AS n,
               count(archivo_url)::int AS con_archivo, count(fecha_vencimiento)::int AS con_fecha
        FROM documentos_vehiculo GROUP BY tipo ORDER BY tipo`;
  for (const d of docs) {
    const destino = migrado ? ` → ${d.nuevo ?? "SISTEMA ANTERIOR"}` : "";
    console.log(`  - "${d.tipo}"${destino}: ${d.n} (con archivo ${d.con_archivo}, con fecha ${d.con_fecha})`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
