import { apiClient, delay } from "./apiClient";

const MOCK_MODE = true;

export const TRABAJADORES = ["J. Ramírez Soto", "S. Vega Luna", "Milagros Ríos", "Alonso Torres", "Pedro Castañeda"];

let cursosMock = [
  { id: 1, trabajador: "J. Ramírez Soto", iniciales: "JR", empresa: "corevex", tipo: "EMO", vence: "26 ago 2026", estado: "vencido" },
  { id: 2, trabajador: "Milagros Ríos", iniciales: "MR", empresa: "corevex", tipo: "Fotocheck", vence: "15 sep 2026", estado: "porvencer" },
  { id: 3, trabajador: "Alonso Torres", iniciales: "AT", empresa: "electro", tipo: "Curso", vence: "20 dic 2026", estado: "vigente" },
];

export async function listarCursos({ empresa, estado, q } = {}) {
  if (MOCK_MODE) {
    await delay();
    return cursosMock.filter((c) => {
      if (empresa && c.empresa !== empresa) return false;
      if (estado && c.estado !== estado) return false;
      if (q && !c.trabajador.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }
  // TODO backend: GET /api/cursos-certificaciones?empresa=&estado=&q=
  return apiClient.get("/cursos-certificaciones", { empresa, estado, q });
}

export async function crearCurso(datos) {
  if (MOCK_MODE) {
    await delay();
    const nuevo = {
      id: Date.now(),
      trabajador: datos.trabajador,
      iniciales: datos.trabajador.split(" ").map((p) => p[0]).slice(0, 2).join(""),
      empresa: datos.empresa,
      tipo: datos.tipo,
      vence: datos.fechaVencimiento,
      estado: "vigente",
    };
    cursosMock = [nuevo, ...cursosMock];
    return nuevo;
  }
  // TODO backend: POST /api/cursos-certificaciones { ...datos }
  return apiClient.post("/cursos-certificaciones", datos);
}

// TODO backend: GET /api/personal?empresa=&q= — todavía no hay pantalla
// de "Personal" propia; esto queda listo para cuando se agregue (por
// ejemplo, para el selector de "trabajador" en los formularios de
// arriba, hoy resuelto con la constante TRABAJADORES).
export async function listarPersonal({ empresa, q } = {}) {
  if (MOCK_MODE) {
    await delay();
    return TRABAJADORES.filter((nombre) => !q || nombre.toLowerCase().includes(q.toLowerCase()));
  }
  return apiClient.get("/personal", { empresa, q });
}
