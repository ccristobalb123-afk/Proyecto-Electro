import { apiClient, delay } from "./apiClient";

const MOCK_MODE = true;

// TODO backend: GET /api/categorias-equipo (tabla CategoriaEquipo) —
// camposPersonalizados define qué campos pide cada categoría.
export const CATEGORIAS = {
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

// Agrega una categoría nueva (con sus propios campos personalizados) al
// catálogo. Mutamos el objeto CATEGORIAS directamente (en vez de
// reasignarlo) para que todo lo que ya lo usa — el select de categorías,
// el agrupador de EquiposGrid, etc. — la vea sin tener que refactorizar
// nada más: son la misma referencia de objeto en toda la app.
// TODO backend: POST /api/categorias-equipo { nombre, campos } — cuando
// haya backend, esto pasa a ser la fuente de verdad de CATEGORIAS en vez
// de mutar el objeto en memoria.
export function agregarCategoria(nombre, campos) {
  const nombreLimpio = nombre.trim();
  CATEGORIAS[nombreLimpio] = campos
    .filter((c) => c.nombre.trim())
    .map((c) => ({ nombre: c.nombre.trim(), placeholder: c.placeholder.trim() }));
  return nombreLimpio;
}

let equiposMock = [
  { id: 1, codigo: "PP-ESC-EMB-009", categoria: "Escaleras Embonables", empresa: "corevex", responsable: "Camión CJO-871", estado: "asignado", camposValores: { Pasos: "8" }, ultInspeccion: "30/07/2026", proxInspeccion: "30/01/2027" },
  { id: 2, codigo: "EQ-GD-021", categoria: "Guantes Dieléctricos", empresa: "electro", responsable: null, estado: "vencido", camposValores: { Clase: "Clase 0", Talla: "M" } },
  { id: 3, codigo: "EQ-ER-072", categoria: "Estrobo Regulable", empresa: "corevex", responsable: "Milagros R.", estado: "mantenimiento", camposValores: { "Longitud (m)": "1.2", "Capacidad (kg)": "100" } },
  { id: 4, codigo: "EQ-PA-039", categoria: "Pinzas Amperimétricas", empresa: "electro", responsable: null, estado: "debaja", camposValores: { Marca: "Fluke" } },
  { id: 5, codigo: "EQ-LV-058", categoria: "Línea de Vida", empresa: "corevex", responsable: "Alonso T.", estado: "asignado", camposValores: { "Longitud (m)": "1.8" } },
];

const HOJA_DE_VIDA_MOCK = {
  "PP-ESC-EMB-009": [
    { titulo: "Asignado a Camión CJO-871", fecha: "12 ago 2026", tone: "success" },
    { titulo: "Inspección interna — Aprobado", fecha: "30 jul 2026", tone: "volt" },
    { titulo: "Registrado en el sistema", fecha: "15 ene 2026" },
  ],
  "EQ-GD-021": [
    { titulo: "Devuelto — sin responsable actual", fecha: "19 ago 2026" },
    { titulo: "Registrado en el sistema", fecha: "20 feb 2026" },
  ],
  "EQ-ER-072": [
    { titulo: "Enviado a mantenimiento", fecha: "21 ago 2026", tone: "volt" },
    { titulo: "Asignado a Milagros Ríos", fecha: "10 jun 2026", tone: "success" },
  ],
  "EQ-PA-039": [
    { titulo: "Dado de baja — desgaste", fecha: "15 ago 2026" },
    { titulo: "Registrado en el sistema", fecha: "10 ene 2026" },
  ],
  "EQ-LV-058": [
    { titulo: "Asignado a Alonso Torres", fecha: "18 ago 2026", tone: "success" },
    { titulo: "Registrado en el sistema", fecha: "22 abr 2026" },
  ],
};

export async function listarEquipos({ empresa, categoria, q } = {}) {
  if (MOCK_MODE) {
    await delay();
    return equiposMock.filter((eq) => {
      if (empresa && eq.empresa !== empresa) return false;
      if (categoria && eq.categoria !== categoria) return false;
      if (q && !eq.codigo.toLowerCase().includes(q.toLowerCase()) && !eq.categoria.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }
  // TODO backend: GET /api/equipos?empresa=&categoria=&q=&page=&pageSize=
  return apiClient.get("/equipos", { empresa, categoria, q });
}

export async function actualizarFotosEquipo(equipoId, fotos) {
  if (MOCK_MODE) {
    await delay(200);
    equiposMock = equiposMock.map((eq) => (eq.id === equipoId ? { ...eq, fotos: fotos.filter(Boolean) } : eq));
    return equiposMock.find((eq) => eq.id === equipoId);
  }
  // TODO backend: PATCH /api/equipos/:id/fotos { fotos } — el backend sube
  // las imágenes (acá van en base64) a almacenamiento real.
  return apiClient.patch(`/equipos/${equipoId}/fotos`, { fotos });
}

export async function crearEquipo({ codigo, categoria, empresa, camposValores, fotos }) {
  if (MOCK_MODE) {
    await delay();
    const nuevo = {
      id: Date.now(),
      codigo: codigo.trim(),
      categoria,
      empresa,
      responsable: null,
      estado: "disponible",
      camposValores,
      fotos: (fotos || [null, null]).filter(Boolean),
    };
    equiposMock = [nuevo, ...equiposMock];
    return nuevo;
  }
  // TODO backend: POST /api/equipos { codigo, categoria, empresa, camposValores, fotos }
  // — el backend valida que el código no exista, y sube las fotos (base64
  // acá en el mock) a almacenamiento real, devolviendo sus URLs.
  return apiClient.post("/equipos", { codigo, categoria, empresa, camposValores, fotos });
}

export async function cambiarEstadoEquipo(equipoId, estado) {
  if (MOCK_MODE) {
    await delay(200);
    const actual = equiposMock.find((eq) => eq.id === equipoId);
    // "Asignado" ahora exige elegir un camión registrado (asignarEquipo) y
    // "Mantenimiento" exige un comentario (enviarAMantenimiento) — ambos
    // tienen su propio flujo con modal, no se setean directo desde acá.
    if (estado === "asignado") {
      throw new Error("Para asignar un equipo hay que elegir un camión registrado.");
    }
    if (estado === "mantenimiento") {
      throw new Error("Para enviar a mantenimiento hay que indicar qué tiene el equipo.");
    }
    // Un equipo vencido o dado de baja no puede volver a asignarse ni
    // pasar directo a otro estado operativo sin pasar antes por una
    // inspección/reactivación explícita.
    if (actual && (actual.estado === "vencido" || actual.estado === "debaja") && estado === "asignado") {
      throw new Error("Un equipo vencido o de baja no se puede asignar.");
    }
    equiposMock = equiposMock.map((eq) => (eq.id === equipoId ? { ...eq, estado } : eq));
    return equiposMock.find((eq) => eq.id === equipoId);
  }
  // TODO backend: PATCH /api/equipos/:id/estado { estado } — el backend
  // debe repetir esta misma validación, nunca confiar solo en el frontend.
  return apiClient.patch(`/equipos/${equipoId}/estado`, { estado });
}

// Asigna el equipo a un camión ya registrado (no a un texto libre ni a
// una persona) — el vehículo viene de vehiculosService.listarVehiculos().
export async function asignarEquipo(equipoId, vehiculo) {
  if (MOCK_MODE) {
    await delay(200);
    equiposMock = equiposMock.map((eq) =>
      eq.id === equipoId
        ? { ...eq, estado: "asignado", responsable: `Camión ${vehiculo.placa}`, vehiculoId: vehiculo.id }
        : eq
    );
    return equiposMock.find((eq) => eq.id === equipoId);
  }
  // TODO backend: PATCH /api/equipos/:id/estado { estado: "asignado", vehiculoId }
  return apiClient.patch(`/equipos/${equipoId}/estado`, { estado: "asignado", vehiculoId: vehiculo.id });
}

// Envía el equipo a mantenimiento, exigiendo un comentario de qué tiene.
export async function enviarAMantenimiento(equipoId, comentario) {
  if (MOCK_MODE) {
    await delay(200);
    equiposMock = equiposMock.map((eq) =>
      eq.id === equipoId
        ? { ...eq, estado: "mantenimiento", responsable: null, vehiculoId: null, comentarioMantenimiento: comentario }
        : eq
    );
    return equiposMock.find((eq) => eq.id === equipoId);
  }
  // TODO backend: PATCH /api/equipos/:id/estado { estado: "mantenimiento", comentario }
  return apiClient.patch(`/equipos/${equipoId}/estado`, { estado: "mantenimiento", comentario });
}

export async function devolverEquipo(equipoId) {
  if (MOCK_MODE) {
    await delay(200);
    equiposMock = equiposMock.map((eq) => (eq.id === equipoId ? { ...eq, estado: "disponible", responsable: null } : eq));
    return equiposMock.find((eq) => eq.id === equipoId);
  }
  // TODO backend: PATCH /api/equipos/:id/estado { estado: "disponible" }
  return apiClient.patch(`/equipos/${equipoId}/estado`, { estado: "disponible" });
}

export async function darDeBajaEquipo(equipoId, motivo) {
  if (MOCK_MODE) {
    await delay();
    equiposMock = equiposMock.map((eq) => (eq.id === equipoId ? { ...eq, estado: "debaja" } : eq));
    return equiposMock.find((eq) => eq.id === equipoId);
  }
  // TODO backend: PATCH /api/equipos/:id/dar-de-baja { motivo }
  return apiClient.patch(`/equipos/${equipoId}/dar-de-baja`, { motivo });
}

export async function registrarInspeccion(equipoId, datosInspeccion) {
  if (MOCK_MODE) {
    await delay();
    return { ok: true, ...datosInspeccion };
  }
  // TODO backend: POST /api/equipos/:id/inspecciones { ...datosInspeccion }
  return apiClient.post(`/equipos/${equipoId}/inspecciones`, datosInspeccion);
}

export async function obtenerHojaDeVida(codigo) {
  if (MOCK_MODE) {
    await delay(300);
    return HOJA_DE_VIDA_MOCK[codigo] || [];
  }
  // TODO backend: GET /api/equipos/:codigo/historial
  return apiClient.get(`/equipos/${codigo}/historial`);
}
