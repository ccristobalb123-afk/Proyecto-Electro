import { apiClient } from "./apiClient";

export const TIPOS_UNIDAD = ["Camioneta", "Camión", "Minivan", "Grúa", "Auto"];

export async function listarVehiculos({ empresa, tipoUnidad, q, signal } = {}) {
  return apiClient.get("/vehiculos", { empresa, tipoUnidad, q }, { signal });
}

// ---- Catálogo de documentos (espejo de backend/src/lib/documentosVehiculo.js) ----
// `vence: false`: Tarjeta de Propiedad y Lunas Polarizadas pueden no
// tener vencimiento (sin fecha = "No vence", sin alerta).
// `soloGrua`: el Brazo Hidráulico solo se puede marcar en grúas.
export const CATALOGO_DOCUMENTOS = [
  { clave: "SOAT", nombre: "SOAT", vence: true },
  { clave: "REVISION_TECNICA", nombre: "Revisión Técnica", vence: true },
  { clave: "SEGURO_TODO_RIESGO", nombre: "Seguro Contra Todo Riesgo", vence: true },
  { clave: "TARJETA_PROPIEDAD", nombre: "Tarjeta de Propiedad", vence: false },
  { clave: "HABILITACION_VEHICULAR", nombre: "Habilitación Vehicular / Tarjeta de Circulación", vence: true },
  { clave: "LUNAS_POLARIZADAS", nombre: "Lunas Polarizadas", vence: false },
  { clave: "BRAZO_HIDRAULICO", nombre: "Brazo Hidráulico", vence: true, soloGrua: true },
];
export const DIAS_ANTICIPACION_POR_DEFECTO = 30;

export function documentosDisponibles(tipoUnidad) {
  return CATALOGO_DOCUMENTOS.filter((d) => !d.soloGrua || tipoUnidad === "Grúa");
}

// Estado del formulario: una entrada por tipo del catálogo. SOAT y
// Tarjeta de Propiedad vienen marcados (todo vehículo los tiene); el
// resto se marca según aplique.
const MARCADOS_POR_DEFECTO = ["SOAT", "TARJETA_PROPIEDAD"];
export function documentosFormVacios() {
  return Object.fromEntries(
    CATALOGO_DOCUMENTOS.map((d) => [
      d.clave,
      { marcado: MARCADOS_POR_DEFECTO.includes(d.clave), fechaEmision: "", fechaVencimiento: "", diasAnticipacion: DIAS_ANTICIPACION_POR_DEFECTO, archivo: null },
    ])
  );
}

// Desde un vehículo ya guardado (para editar).
export function documentosFormDesde(vehiculo) {
  const base = Object.fromEntries(Object.entries(documentosFormVacios()).map(([k, v]) => [k, { ...v, marcado: false }]));
  for (const d of vehiculo.documentos) {
    base[d.tipo] = {
      marcado: true,
      id: d.id,
      fechaEmision: d.fechaEmision || "",
      fechaVencimiento: d.fechaVencimiento || "",
      diasAnticipacion: d.diasAnticipacion,
      archivo: null,
      archivoUrl: d.archivoUrl,
      archivoNombre: d.archivoNombre,
    };
  }
  return base;
}

// Mismas reglas que el backend; devuelve { clave: mensaje } (vacío = ok).
export function validarDocumentos(documentos, tipoUnidad) {
  const errores = {};
  for (const info of CATALOGO_DOCUMENTOS) {
    const d = documentos[info.clave];
    if (!d?.marcado) continue;
    if (info.soloGrua && tipoUnidad !== "Grúa" && !d.id) {
      errores[info.clave] = `${info.nombre} solo aplica a grúas.`;
    } else if (d.fechaEmision && d.fechaVencimiento && d.fechaVencimiento < d.fechaEmision) {
      errores[info.clave] = "El vencimiento no puede ser anterior a la fecha de inspección o emisión.";
    } else if (!Number.isInteger(Number(d.diasAnticipacion)) || Number(d.diasAnticipacion) < 1 || Number(d.diasAnticipacion) > 365) {
      errores[info.clave] = "Los días de anticipación deben ser un número entero entre 1 y 365.";
    }
  }
  return errores;
}

// Lo que se manda al backend: solo los marcados. `subidos` trae
// { clave: { url, nombre } } de los archivos que se acaban de subir.
export function documentosParaEnviar(documentos, subidos = {}) {
  return CATALOGO_DOCUMENTOS.filter((info) => documentos[info.clave]?.marcado).map((info) => {
    const d = documentos[info.clave];
    return {
      tipo: info.clave,
      fechaEmision: d.fechaEmision || null,
      fechaVencimiento: d.fechaVencimiento || null,
      diasAnticipacion: Number(d.diasAnticipacion),
      ...(subidos[info.clave] ? { archivoUrl: subidos[info.clave].url, archivoNombre: subidos[info.clave].nombre } : {}),
    };
  });
}

export async function crearVehiculo({ placa, tipoUnidad, empresa, cuadrilla, documentos }) {
  return apiClient.post("/vehiculos", { placa, tipoUnidad, empresa, cuadrilla, documentos });
}

// Placa, cuadrilla y la lista COMPLETA de documentos que aplican — no
// tipoUnidad ni empresa (ver nota en vehiculos.service.js del backend).
export async function actualizarVehiculo(vehiculoId, { placa, cuadrilla, documentos }) {
  return apiClient.patch(`/vehiculos/${vehiculoId}`, { placa, cuadrilla, documentos });
}

export async function eliminarVehiculo(vehiculoId) {
  return apiClient.delete(`/vehiculos/${vehiculoId}`);
}

// El documento se identifica por su id real (no por posición en el
// array — la posición puede cambiar de orden, el id nunca).
export async function actualizarDocumento(vehiculoId, documentoId, datos) {
  return apiClient.patch(`/vehiculos/${vehiculoId}/documentos/${documentoId}`, datos);
}

export async function obtenerHistorial(placa) {
  return apiClient.get(`/vehiculos/${placa}/historial`);
}

// "12/03/2027" a partir de "2027-03-12", sin pasar por la zona horaria
// (new Date("2027-03-12") en Perú mostraría el día anterior).
export function fechaCorta(iso) {
  if (!iso) return null;
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}
