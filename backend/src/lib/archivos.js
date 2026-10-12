import path from "node:path";
import fs from "node:fs/promises";
import { db } from "./db.js";

// Un mismo archivoUrl puede estar referenciado por exactamente 1 de
// estos 6 lugares — se buscan todos en paralelo y se devuelve el
// primero que aparezca. Documentos de vehículo devuelven 2 empresas
// (dueña y uso) porque un camión puede ser de una y estar en uso de
// la otra, igual que en el resto del sistema.
export async function empresasDelArchivo(archivoUrl) {
  const [contrato, curso, factura, facturaPorPagar, gasto, documentoVehiculo] = await Promise.all([
    db.contrato.findFirst({ where: { archivoUrl }, include: { empresa: true } }),
    db.curso.findFirst({ where: { archivoUrl }, include: { empresa: true } }),
    db.factura.findFirst({ where: { archivoUrl }, include: { empresa: true } }),
    db.facturaPorPagar.findFirst({ where: { archivoUrl }, include: { empresa: true } }),
    db.gasto.findFirst({ where: { archivoUrl }, include: { empresa: true } }),
    db.documentoVehiculo.findFirst({
      where: { archivoUrl },
      include: { vehiculo: { include: { empresaDuena: true, empresaUso: true } } },
    }),
  ]);

  if (contrato) return [contrato.empresa.slug];
  if (curso) return [curso.empresa.slug];
  if (factura) return [factura.empresa.slug];
  if (facturaPorPagar) return [facturaPorPagar.empresa.slug];
  if (gasto) return [gasto.empresa.slug];
  if (documentoVehiculo) return [documentoVehiculo.vehiculo.empresaDuena.slug, documentoVehiculo.vehiculo.empresaUso.slug];

  // null = nadie lo referencia todavía — o el usuario lo acaba de subir
  // y el formulario que lo va a guardar (crear contrato, etc.) todavía
  // no terminó, o quedó huérfano porque ese paso falló.
  return null;
}

const CARPETA_UPLOADS = path.resolve("uploads");

// Después de eliminar un registro, borra su archivo del disco en el
// momento — antes quedaba ahí hasta la limpieza de huérfanos del
// siguiente reinicio del servidor. Solo lo borra si ya no lo usa
// ningún otro registro, y nunca hace fallar la eliminación: si el
// archivo no está o no se puede borrar, la limpieza lo reintenta.
export async function borrarArchivoSiHuerfano(archivoUrl) {
  if (!archivoUrl || !archivoUrl.startsWith("/api/uploads/")) return;
  const nombre = path.basename(archivoUrl);
  if (nombre.includes("..")) return;
  try {
    if ((await empresasDelArchivo(archivoUrl)) !== null) return;
    await fs.unlink(path.join(CARPETA_UPLOADS, nombre));
  } catch (err) {
    if (err.code !== "ENOENT") console.error("No se pudo borrar el archivo", nombre, err.message);
  }
}
