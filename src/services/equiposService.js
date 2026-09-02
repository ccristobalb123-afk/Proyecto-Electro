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

export async function crearEquipo({ codigo, categoria, empresa, camposValores }) {
  if (MOCK_MODE) {
    await delay();
    const nuevo = { id: Date.now(), codigo: codigo.trim(), categoria, empresa, responsable: null, estado: "disponible", camposValores };
    equiposMock = [nuevo, ...equiposMock];
    return nuevo;
  }
  // TODO backend: POST /api/equipos { codigo, categoria, empresa, camposValores }
  // — el backend valida que el código no exista.
  return apiClient.post("/equipos", { codigo, categoria, empresa, camposValores });
}

export async function cambiarEstadoEquipo(equipoId, estado) {
  if (MOCK_MODE) {
    await delay(200);
    equiposMock = equiposMock.map((eq) => (eq.id === equipoId ? { ...eq, estado } : eq));
    return equiposMock.find((eq) => eq.id === equipoId);
  }
  // TODO backend: PATCH /api/equipos/:id/estado { estado }
  return apiClient.patch(`/equipos/${equipoId}/estado`, { estado });
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
