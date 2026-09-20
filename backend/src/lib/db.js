import { PrismaClient } from "@prisma/client";

// En desarrollo, `node --watch` reinicia el proceso en cada cambio de
// archivo — sin este patrón, cada reinicio abriría una nueva conexión a
// la base de datos sin cerrar la anterior, hasta agotar el pool.
// Guardamos la instancia en `globalThis` para reutilizarla entre reinicios.
const globalParaPrisma = globalThis;

export const db =
  globalParaPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalParaPrisma.prisma = db;
}

// Para operaciones donde 2 personas podrían leer el mismo saldo al
// mismo tiempo y las dos alcanzar a pagar más de lo que en realidad
// queda pendiente (ej. registrar un pago) — Serializable hace que
// Postgres rechace la segunda transacción si pisó datos que la primera
// ya había leído, y acá se reintenta automáticamente unas pocas veces
// en vez de hacer que el usuario tenga que volver a intentar a mano.
export async function transaccionSerializable(fn, intentos = 3) {
  for (let intento = 1; intento <= intentos; intento++) {
    try {
      return await db.$transaction(fn, { isolationLevel: "Serializable" });
    } catch (err) {
      // P2034 = conflicto de escritura detectado por Postgres — el
      // único caso en que vale la pena reintentar solo. Cualquier otro
      // error (saldo insuficiente, no encontrado, etc.) debe propagarse
      // tal cual, no reintentarse.
      if (err.code === "P2034" && intento < intentos) continue;
      throw err;
    }
  }
}
