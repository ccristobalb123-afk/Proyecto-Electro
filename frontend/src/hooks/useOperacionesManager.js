import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import * as equiposService from "../services/equiposService";
import * as vehiculosService from "../services/vehiculosService";
import { subirArchivo } from "../services/uploadsService";
import { useDebounce } from "./useDebounce";
import { useAsyncList } from "./useAsyncList";
import { useAccion } from "./useAccion";
import { useModal } from "./useModal";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";
import { valoresEquipoVacios, valoresParaEnviar, hoyEnPeru, fotosIniciales, fotosQueFaltan } from "../components/operaciones/camposEquipo";

const normalizar = (t) => (t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

// Sin tipo preelegido: al elegirlo aparecen solo sus campos.
function formEquipoVacio() {
  return { categoria: "", empresa: "corevex", valores: valoresEquipoVacios(), fotos: [null, null] };
}

function formVehiculoVacio() {
  return { placa: "", tipoUnidad: "Camioneta", empresa: "corevex", cuadrilla: "", documentos: vehiculosService.documentosFormVacios() };
}

// Siempre interna (ya no se elige el tipo); las fotos arrancan en
// "mantener las actuales".
function formInspeccionVacio(eq) {
  return { fechaInspeccion: "", fechaVencimiento: "", diasAnticipacion: eq?.diasAnticipacionInspeccion ?? 15, resultado: "aprobado", fotos: fotosIniciales(eq?.fotos) };
}

// Toda la lógica de negocio de la página Operaciones — antes vivía
// dentro de Operaciones.jsx mezclada con el JSX de las 2 pestañas
// (Equipos/Vehículos) y sus 8 modales. Ahora la página solo arma la
// vista con lo que este hook le devuelve.
export function useOperacionesManager() {
  const { mostrarToast } = useToast();
  const { confirmar } = useConfirm();
  const acciones = useAccion();
  // Error del servidor en los modales de una sola acción (inspección,
  // baja, asignar, mantenimiento, fotos) — se muestra DENTRO del modal,
  // que queda abierto; antes salía en un toast detrás del modal.
  const [errorAccion, setErrorAccion] = useState("");
  // ?tab=vehiculos&q=<placa> — enlace directo desde un aviso de vencimiento.
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(["vehiculos", "asignaciones"].includes(searchParams.get("tab")) ? searchParams.get("tab") : "equipos"); // "equipos" | "vehiculos" | "asignaciones"
  const [errorEquipo, setErrorEquipo] = useState("");
  const [errorVehiculo, setErrorVehiculo] = useState("");
  const [historialItems, setHistorialItems] = useState([]);
  const [historialAsignaciones, setHistorialAsignaciones] = useState(null); // solo equipos
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroEstadoEquipo, setFiltroEstadoEquipo] = useState("");
  const [filtroTipoUnidad, setFiltroTipoUnidad] = useState("");
  // Pestaña Asignaciones: "" (todos) | "persona" | "camion".
  const [filtroDestinatario, setFiltroDestinatario] = useState("");
  const [busqueda, setBusqueda] = useState(searchParams.get("q") || "");
  const busquedaDebounced = useDebounce(busqueda, 400);

  // Tipos de equipo con sus reglas (destino, datos que piden) — los manda
  // el backend, en su orden. Se recargan al crear o corregir uno desde
  // "Tipos de equipo".
  const [tipos, setTipos] = useState([]);
  const recargarTipos = () => equiposService.listarCategorias().then(setTipos).catch(() => setTipos([]));
  useEffect(() => {
    recargarTipos();
  }, []);

  // ---- Modales ----
  const modalNuevo = useModal();
  const modalHistorial = useModal(); // equipo|vehiculo seleccionado
  const modalInspeccion = useModal(); // equipo seleccionado
  // Si se abrió para renovar fechas de un equipo vencido: "vencido" (enlace
  // "Renovar fechas"), "devuelto" (al devolverlo) o "disponible" (eligió
  // Disponible: al aprobar se libera la asignación).
  const [contextoInspeccion, setContextoInspeccion] = useState(null);
  const modalBaja = useModal(); // equipo seleccionado
  const modalAsignar = useModal(); // equipo seleccionado
  const modalMantenimiento = useModal(); // equipo seleccionado
  const modalFotos = useModal(); // equipo seleccionado
  const [fotosEditando, setFotosEditando] = useState([null, null]); // "actual" | foto nueva | null
  const modalDocs = useModal(); // vehiculo seleccionado
  const modalEditarEquipo = useModal(); // equipo seleccionado
  const modalEditarVehiculo = useModal(); // vehiculo seleccionado

  const [fEquipo, setFEquipo] = useState(formEquipoVacio());
  const [fEquipoEditar, setFEquipoEditar] = useState({ categoria: "", valores: valoresEquipoVacios(), camposValores: {} });
  const [errorEditarEquipo, setErrorEditarEquipo] = useState("");

  const [fVehiculo, setFVehiculo] = useState(formVehiculoVacio());
  const [fVehiculoEditar, setFVehiculoEditar] = useState({ placa: "", cuadrilla: "", documentos: null });
  const [erroresDocumentos, setErroresDocumentos] = useState({});
  const [errorEditarVehiculo, setErrorEditarVehiculo] = useState("");
  const [fInspeccion, setFInspeccion] = useState(formInspeccionVacio());

  // ---- Formularios de los modales de un solo campo ----
  const [motivoBaja, setMotivoBaja] = useState("");
  const [errorMotivo, setErrorMotivo] = useState(false);
  // Asignar: el id del destinatario elegido. Al abrir se traen los que
  // admite el tipo del equipo (solo camiones o solo personas).
  const [destinoId, setDestinoId] = useState("");
  const [errorAsignar, setErrorAsignar] = useState(false);
  const [destinatarios, setDestinatarios] = useState(null);
  const [cargandoDestinatarios, setCargandoDestinatarios] = useState(false);
  const [errorDestinatarios, setErrorDestinatarios] = useState(null);
  const [comentarioMantenimiento, setComentarioMantenimiento] = useState("");
  const [errorMantenimiento, setErrorMantenimiento] = useState(false);

  // Carga de equipos: se re-consulta al backend cuando cambia un filtro,
  // en vez de traer todo y filtrar en el cliente (importante apenas haya
  // cientos/miles de registros reales).
  const {
    data: equipos,
    setData: setEquipos,
    loading: cargandoEquipos,
    error: errorEquipos,
    reload: recargarEquipos,
  } = useAsyncList(
    (signal) => equiposService.listarEquipos({ empresa: filtroEmpresa, categoria: filtroCategoria, estado: filtroEstadoEquipo, q: busquedaDebounced, signal }),
    [filtroEmpresa, filtroCategoria, filtroEstadoEquipo, busquedaDebounced]
  );

  const {
    data: vehiculos,
    setData: setVehiculos,
    loading: cargandoVehiculos,
    error: errorVehiculos,
    reload: recargarVehiculos,
  } = useAsyncList(
    (signal) => vehiculosService.listarVehiculos({ empresa: filtroEmpresa, tipoUnidad: filtroTipoUnidad, q: busquedaDebounced, signal }),
    [filtroEmpresa, filtroTipoUnidad, busquedaDebounced]
  );

  // Pestaña Asignaciones: se trae al entrar en ella (y al volver).
  const {
    data: asignacionesActuales,
    loading: cargandoAsignaciones,
    error: errorAsignaciones,
    reload: recargarAsignaciones,
  } = useAsyncList((signal) => (tab === "asignaciones" ? equiposService.listarAsignacionesActuales({ signal }) : Promise.resolve([])), [tab]);

  // Trae la hoja de vida (equipo o vehículo) recién cuando se abre el
  // modal, no de antemano para todos los registros.
  useEffect(() => {
    if (!modalHistorial.dato) return;
    setCargandoHistorial(true);
    setHistorialAsignaciones(null);
    // Por id: los equipos sin código (arnés, estrobos...) también tienen hoja de vida.
    const esVehiculo = !!modalHistorial.dato.placa;
    const obtener = esVehiculo
      ? vehiculosService.obtenerHistorial(modalHistorial.dato.placa)
      : equiposService.obtenerHojaDeVida(modalHistorial.dato.id);
    const asignaciones = esVehiculo ? Promise.resolve(null) : equiposService.obtenerAsignaciones(modalHistorial.dato.id).catch(() => []);
    Promise.all([obtener.catch(() => []), asignaciones])
      .then(([items, asig]) => {
        setHistorialItems(items);
        setHistorialAsignaciones(asig);
      })
      .finally(() => setCargandoHistorial(false));
  }, [modalHistorial.dato]);

  function cambiarTab(nuevoTab) {
    setTab(nuevoTab);
    setFiltroCategoria("");
    setFiltroEstadoEquipo("");
    setFiltroTipoUnidad("");
    setFiltroDestinatario("");
  }

  function openNuevo() {
    if (tab === "equipos") {
      setFEquipo(formEquipoVacio());
      setErrorEquipo("");
    } else {
      setFVehiculo(formVehiculoVacio());
      setErrorVehiculo("");
      setErroresDocumentos({});
    }
    modalNuevo.abrir();
  }

  async function handleGuardarEquipo(e) {
    e.preventDefault();
    const tipo = tipos.find((t) => t.nombre === fEquipo.categoria);
    if (!tipo) return;
    setErrorEquipo("");
    const faltan = fotosQueFaltan(fEquipo.fotos);
    if (faltan) {
      setErrorEquipo(faltan === 2 ? "Agrega las 2 fotos del equipo." : "Falta 1 de las 2 fotos del equipo.");
      return;
    }

    await acciones.ejecutar("modal", async () => {
      try {
        // Solo los campos del tipo elegido. El backend vuelve a exigir los
        // obligatorios, el código/serial único dentro del tipo y las fechas.
        const nuevo = await equiposService.crearEquipo({
          categoria: fEquipo.categoria,
          empresa: fEquipo.empresa,
          fotos: fEquipo.fotos,
          ...valoresParaEnviar(fEquipo.valores, tipo.campos),
        });
        setEquipos((prev) => [nuevo, ...prev]);
        modalNuevo.cerrar();
        mostrarToast("Equipo registrado", { tipo: "success" });
      } catch (err) {
        setErrorEquipo(err.message || "No se pudo guardar el equipo.");
      }
    });
  }

  // Sube, uno por uno, los archivos elegidos en la sección Documentos y
  // devuelve { clave: { url, nombre } } para mandarlos con el vehículo.
  async function subirArchivosDocumentos(documentos, { subida, etapa }) {
    const pendientes = Object.entries(documentos).filter(([, d]) => d.marcado && d.archivo);
    const subidos = {};
    for (const [i, [clave, d]] of pendientes.entries()) {
      if (pendientes.length > 1) etapa(`Subiendo archivo ${i + 1} de ${pendientes.length}…`);
      subidos[clave] = await subirArchivo(d.archivo, subida);
    }
    return subidos;
  }

  function validarFormDocumentos(documentos, tipoUnidad, setError) {
    const errores = vehiculosService.validarDocumentos(documentos, tipoUnidad);
    setErroresDocumentos(errores);
    if (Object.keys(errores).length > 0) {
      setError("Revisa los datos de los documentos marcados.");
      return false;
    }
    return true;
  }

  async function handleGuardarVehiculo(e) {
    e.preventDefault();
    setErrorVehiculo("");
    if (!fVehiculo.placa.trim()) {
      setErrorVehiculo("Ingresa la placa.");
      return;
    }
    if (!validarFormDocumentos(fVehiculo.documentos, fVehiculo.tipoUnidad, setErrorVehiculo)) return;
    await acciones.ejecutar("modal", async (ctx) => {
      try {
        const subidos = await subirArchivosDocumentos(fVehiculo.documentos, ctx);
        ctx.etapa("Registrando…");
        const nuevo = await vehiculosService.crearVehiculo({
          ...fVehiculo,
          documentos: vehiculosService.documentosParaEnviar(fVehiculo.documentos, subidos),
        });
        setVehiculos((prev) => [nuevo, ...prev]);
        modalNuevo.cerrar();
        mostrarToast("Vehículo registrado", { tipo: "success" });
      } catch (err) {
        setErrorVehiculo(err.message || "No se pudo guardar el vehículo.");
      }
    });
  }

  async function handleGuardarInspeccion(e) {
    e.preventDefault();
    setErrorAccion("");
    // Aprobado deja el equipo en uso: no con un vencimiento que ya pasó.
    const { fechaInspeccion, fechaVencimiento, resultado } = fInspeccion;
    const faltan = fotosQueFaltan(fInspeccion.fotos);
    if (faltan) {
      setErrorAccion(`El equipo debe quedar con 2 fotos: falta${faltan === 1 ? " 1" : "n 2"}. Agrégala${faltan === 1 ? "" : "s"} con "Tomar foto" o "Elegir archivo".`);
      return;
    }
    if (!fechaInspeccion || !fechaVencimiento) {
      setErrorAccion("Ingresa la fecha de inspección y la de vencimiento.");
      return;
    }
    if (fechaVencimiento < fechaInspeccion) {
      setErrorAccion("La fecha de vencimiento no puede ser anterior a la fecha de inspección.");
      return;
    }
    if (resultado === "aprobado" && fechaVencimiento < hoyEnPeru()) {
      setErrorAccion("La fecha de vencimiento ya pasó: con la inspección aprobada el equipo seguiría vencido. Ingresa una fecha de vencimiento de hoy en adelante.");
      return;
    }
    await acciones.ejecutar("modal", async () => {
      try {
        // El backend hace esto como una sola operación atómica: registra la
        // inspección Y cambia el estado según el resultado (antes eran 2
        // llamadas separadas del lado del frontend, con el riesgo de quedar
        // desincronizadas si la segunda fallaba).
        const eq = modalInspeccion.dato;
        const actualizado = await equiposService.registrarInspeccion(eq.id, { ...fInspeccion, dejarDisponible: contextoInspeccion === "disponible" });
        setEquipos((prev) => prev.map((x) => (x.id === actualizado.id ? actualizado : x)));
        modalInspeccion.cerrar();
        mostrarToast(
          contextoInspeccion && resultado === "aprobado"
            ? `Fechas renovadas: ${eq.identificador} ${actualizado.estado === "asignado" ? `sigue asignado a ${actualizado.responsable}` : "está Disponible"}`
            : "Inspección actualizada",
          { tipo: "success" }
        );
      } catch (err) {
        setErrorAccion(err.message || "No se pudo registrar la inspección.");
      }
    });
  }

  async function handleConfirmarBaja() {
    setErrorAccion("");
    if (!motivoBaja.trim()) {
      setErrorMotivo(true);
      return;
    }
    await acciones.ejecutar("modal", async () => {
      try {
        const actualizado = await equiposService.darDeBajaEquipo(modalBaja.dato.id, motivoBaja);
        setEquipos((prev) => prev.map((eq) => (eq.id === actualizado.id ? actualizado : eq)));
        modalBaja.cerrar();
        setMotivoBaja("");
        mostrarToast("Equipo dado de baja", { tipo: "success" });
      } catch (err) {
        setErrorAccion(err.message || "No se pudo dar de baja el equipo.");
      }
    });
  }

  // Renovar fechas (la única forma de sacar un equipo de Vencido) es
  // "Actualizar inspección" con el contexto de por qué se abrió.
  // En Mantenimiento con la fecha vencida (por ejemplo, en la prueba): el
  // mismo modal, para registrar el resultado de la prueba.
  function abrirRenovar(eq, { devuelto = false, disponible = false } = {}) {
    const contexto = devuelto ? "devuelto" : disponible ? "disponible" : eq.estado === "mantenimiento" ? "mantenimiento" : "vencido";
    abrirInspeccion(eq, { contexto, fechaInspeccion: hoyEnPeru() });
  }

  async function handleDevolver(eq) {
    await acciones.ejecutar(`equipo-${eq.id}`, async () => {
      try {
        const actualizado = await equiposService.devolverEquipo(eq.id);
        setEquipos((prev) => prev.map((e) => (e.id === actualizado.id ? actualizado : e)));
        if (actualizado.estado === "vencido") {
          // Devuelto, pero sigue Vencido: se ofrece renovar sus fechas.
          mostrarToast(`Equipo ${eq.identificador} devuelto: ya no está asignado a ${eq.responsable}. Sigue Vencido.`, { tipo: "success" });
          abrirRenovar(actualizado, { devuelto: true });
        } else {
          mostrarToast(`Equipo ${eq.identificador} devuelto: ya no está asignado a ${eq.responsable}`, { tipo: "success" });
        }
      } catch (err) {
        mostrarToast(err.message || "No se pudo devolver el equipo.", { tipo: "error" });
      }
    });
  }

  async function handleCambiarEstado(eq, nuevoEstado) {
    if (nuevoEstado === "debaja") {
      abrirBaja(eq);
      return;
    }
    if (nuevoEstado === "asignado") {
      abrirAsignar(eq);
      return;
    }
    // "Editar comentario de mantenimiento": ya está en Mantenimiento (elegir
    // de nuevo "Mantenimiento" en el desplegable no dispara nada).
    if (nuevoEstado === "mantenimiento" || nuevoEstado === "mantenimiento-comentario") {
      abrirMantenimiento(eq);
      return;
    }
    // Vencido no se elige a mano (depende de la fecha).
    if (!nuevoEstado || nuevoEstado === "vencido") return;
    // Fecha vencida → Disponible: solo renovando sus fechas (y si estaba
    // asignado, al aprobar se libera). También si está en Mantenimiento:
    // el bloqueo mira la fecha, no el estado que se muestra.
    if (nuevoEstado === "disponible" && eq.vencidoPorFecha) {
      abrirRenovar(eq, { disponible: true });
      return;
    }
    await acciones.ejecutar(`equipo-${eq.id}`, async () => {
      try {
        const actualizado = await equiposService.cambiarEstadoEquipo(eq.id, nuevoEstado);
        setEquipos((prev) => prev.map((e) => (e.id === actualizado.id ? actualizado : e)));
        // Pasar a Disponible libera la asignación.
        mostrarToast(eq.responsable ? `Estado actualizado: ya no está asignado a ${eq.responsable}` : "Estado actualizado", { tipo: "success" });
      } catch (err) {
        // La lista estaba desactualizada (venció mientras se miraba): se renueva.
        if (err.code === "EQUIPO_VENCIDO" && nuevoEstado === "disponible") abrirRenovar({ ...eq, estado: "vencido" }, { disponible: true });
        else mostrarToast(err.message || "No se pudo cambiar el estado del equipo.", { tipo: "error" });
      }
    });
  }

  async function cargarDestinatarios(eq = modalAsignar.dato) {
    setCargandoDestinatarios(true);
    setErrorDestinatarios(null);
    setDestinatarios(null);
    try {
      setDestinatarios(await equiposService.listarDestinatarios(eq.id));
    } catch (err) {
      setErrorDestinatarios(err);
    } finally {
      setCargandoDestinatarios(false);
    }
  }

  // También para reasignar (el modal ve que el equipo ya tiene destinatario).
  function abrirAsignar(eq) {
    setErrorAccion("");
    setDestinoId("");
    setErrorAsignar(false);
    modalAsignar.abrir(eq);
    cargarDestinatarios(eq);
  }

  async function handleConfirmarAsignar() {
    setErrorAccion("");
    if (!destinoId) {
      setErrorAsignar(true);
      return;
    }
    const reasignar = !!modalAsignar.dato.asignadoA;
    await acciones.ejecutar("modal", async () => {
      try {
        const destino = destinatarios.destino === "camion" ? { vehiculoId: Number(destinoId) } : { personalId: Number(destinoId) };
        const actualizado = await equiposService.asignarEquipo(modalAsignar.dato.id, destino);
        setEquipos((prev) => prev.map((e) => (e.id === actualizado.id ? actualizado : e)));
        modalAsignar.cerrar();
        mostrarToast(`Equipo ${reasignar ? "reasignado" : "asignado"} a ${actualizado.responsable}`, { tipo: "success" });
      } catch (err) {
        setErrorAccion(err.message || "No se pudo asignar el equipo.");
        // Alguien más lo asignó mientras tanto: se actualiza quién está libre.
        if (err.code === "YA_TIENE_TIPO") {
          setDestinoId("");
          cargarDestinatarios();
        }
      }
    });
  }

  // Si ya está en Mantenimiento se edita el comentario actual (precargado).
  function abrirMantenimiento(eq) {
    setErrorAccion("");
    setComentarioMantenimiento(eq.estado === "mantenimiento" ? eq.comentarioMantenimiento || "" : "");
    setErrorMantenimiento(false);
    modalMantenimiento.abrir(eq);
  }

  async function handleConfirmarMantenimiento() {
    setErrorAccion("");
    if (!comentarioMantenimiento.trim()) {
      setErrorMantenimiento(true);
      return;
    }
    await acciones.ejecutar("modal", async () => {
      try {
        const yaEstaba = modalMantenimiento.dato.estado === "mantenimiento";
        const actualizado = await equiposService.enviarAMantenimiento(modalMantenimiento.dato.id, comentarioMantenimiento);
        setEquipos((prev) => prev.map((e) => (e.id === actualizado.id ? actualizado : e)));
        modalMantenimiento.cerrar();
        mostrarToast(yaEstaba ? "Comentario actualizado" : "Equipo en mantenimiento", { tipo: "success" });
      } catch (err) {
        setErrorAccion(err.message || "No se pudo enviar el equipo a mantenimiento.");
      }
    });
  }

  function abrirEditarFotos(eq) {
    setErrorAccion("");
    setFotosEditando(fotosIniciales(eq.fotos));
    modalFotos.abrir(eq);
  }

  async function handleGuardarFotos() {
    setErrorAccion("");
    const faltan = fotosQueFaltan(fotosEditando);
    if (faltan) {
      setErrorAccion(`El equipo debe quedar con 2 fotos: falta${faltan === 1 ? " 1" : "n 2"}.`);
      return;
    }
    await acciones.ejecutar("modal", async () => {
      try {
        const actualizado = await equiposService.actualizarFotosEquipo(modalFotos.dato.id, fotosEditando);
        setEquipos((prev) => prev.map((e) => (e.id === actualizado.id ? actualizado : e)));
        modalFotos.cerrar();
        mostrarToast("Fotos guardadas", { tipo: "success" });
      } catch (err) {
        setErrorAccion(err.message || "No se pudieron guardar las fotos.");
      }
    });
  }

  function abrirEditarEquipo(eq) {
    setFEquipoEditar({
      categoria: eq.categoria,
      camposValores: eq.camposValores || {},
      valores: {
        codigo: eq.codigo || "",
        marca: eq.marca || "",
        pasos: eq.pasos != null ? String(eq.pasos) : "",
        serial: eq.serial || "",
        talla: eq.talla || "",
        lote: eq.lote || "",
        fechaFabricacion: eq.fechaFabricacionIso || "",
        fechaInspeccion: eq.ultInspeccionIso || "",
        fechaVencimiento: eq.proxInspeccionIso || "",
        diasAnticipacion: eq.diasAnticipacionInspeccion ?? 15,
      },
    });
    setErrorEditarEquipo("");
    modalEditarEquipo.abrir(eq);
  }

  async function handleGuardarEdicionEquipo(e) {
    e.preventDefault();
    setErrorEditarEquipo("");
    await acciones.ejecutar("modal", async () => {
      try {
        const tipo = tipos.find((t) => t.nombre === fEquipoEditar.categoria);
        const datos = tipo?.antigua
          ? { categoria: fEquipoEditar.categoria, codigo: fEquipoEditar.valores.codigo, camposValores: fEquipoEditar.camposValores }
          : { categoria: fEquipoEditar.categoria, ...valoresParaEnviar(fEquipoEditar.valores, tipo?.campos || []) };
        const actualizado = await equiposService.actualizarEquipo(modalEditarEquipo.dato.id, datos);
        setEquipos((prev) => prev.map((eq) => (eq.id === actualizado.id ? actualizado : eq)));
        modalEditarEquipo.cerrar();
        mostrarToast("Equipo actualizado", { tipo: "success" });
      } catch (err) {
        setErrorEditarEquipo(err.message || "No se pudo guardar los cambios.");
      }
    });
  }

  async function handleEliminarEquipo(eq) {
    const ok = await confirmar({
      titulo: `¿Eliminar el equipo ${eq.identificador}?`,
      mensaje: `Se eliminará el equipo ${eq.identificador} (${eq.categoria}) con sus fotos y su hoja de vida, de forma permanente. Esta acción no se puede deshacer. Si solo quieres retirarlo de uso, usa "Dar de baja".`,
      tipo: "peligro",
      textoConfirmar: "Eliminar equipo",
      textoCargando: "Eliminando…",
      palabraConfirmacion: eq.identificador,
      accion: async () => {
        await equiposService.eliminarEquipo(eq.id);
        setEquipos((prev) => prev.filter((x) => x.id !== eq.id));
      },
    });
    if (ok) mostrarToast("Equipo eliminado", { tipo: "success" });
  }


  function abrirEditarVehiculo(v) {
    setFVehiculoEditar({ placa: v.placa, cuadrilla: v.cuadrilla || "", documentos: vehiculosService.documentosFormDesde(v) });
    setErrorEditarVehiculo("");
    setErroresDocumentos({});
    modalEditarVehiculo.abrir(v);
  }

  async function handleGuardarEdicionVehiculo(e) {
    e.preventDefault();
    setErrorEditarVehiculo("");
    if (!validarFormDocumentos(fVehiculoEditar.documentos, modalEditarVehiculo.dato.tipoUnidad, setErrorEditarVehiculo)) return;
    await acciones.ejecutar("modal", async (ctx) => {
      try {
        const subidos = await subirArchivosDocumentos(fVehiculoEditar.documentos, ctx);
        ctx.etapa("Guardando…");
        const actualizado = await vehiculosService.actualizarVehiculo(modalEditarVehiculo.dato.id, {
          ...fVehiculoEditar,
          documentos: vehiculosService.documentosParaEnviar(fVehiculoEditar.documentos, subidos),
        });
        setVehiculos((prev) => prev.map((v) => (v.id === actualizado.id ? actualizado : v)));
        modalEditarVehiculo.cerrar();
        mostrarToast("Vehículo actualizado", { tipo: "success" });
      } catch (err) {
        setErrorEditarVehiculo(err.message || "No se pudo guardar los cambios.");
      }
    });
  }

  async function handleEliminarVehiculo(v) {
    const ok = await confirmar({
      titulo: `¿Eliminar el vehículo ${v.placa}?`,
      mensaje: `Se eliminará el vehículo ${v.placa} con sus fechas de documentos y su historial, de forma permanente. Esta acción no se puede deshacer.`,
      tipo: "peligro",
      textoConfirmar: "Eliminar vehículo",
      textoCargando: "Eliminando…",
      palabraConfirmacion: v.placa,
      accion: async () => {
        await vehiculosService.eliminarVehiculo(v.id);
        setVehiculos((prev) => prev.filter((x) => x.id !== v.id));
      },
    });
    if (ok) mostrarToast("Vehículo eliminado", { tipo: "success" });
  }


  // Arranca con los días de aviso que ya tiene el equipo (15 si nunca se
  // cambiaron) y con sus fotos actuales (las que falten, vacías).
  function abrirInspeccion(eq, { contexto = null, fechaInspeccion = "" } = {}) {
    setErrorAccion("");
    setContextoInspeccion(contexto);
    setFInspeccion({ ...formInspeccionVacio(eq), fechaInspeccion });
    modalInspeccion.abrir(eq);
  }

  function abrirBaja(eq) {
    setErrorAccion("");
    setMotivoBaja("");
    setErrorMotivo(false);
    modalBaja.abrir(eq);
  }

  // Antes esto solo actualizaba el estado local con una URL temporal
  // (URL.createObjectURL) sin llamar al backend para nada — ahora el
  // documento se identifica por su id real (no por posición en el
  // array) y el backend es quien guarda el cambio de verdad; la
  // respuesta ya trae el vehículo completo y actualizado.
  async function handleSubirDocumento(documentoId, archivo) {
    await acciones.ejecutar(`documento-${documentoId}`, async ({ subida, etapa }) => {
      try {
        const { url, nombre } = await subirArchivo(archivo, subida);
        etapa("Guardando…");
        const vehiculoActualizado = await vehiculosService.actualizarDocumento(
          modalDocs.dato.id,
          documentoId,
          { archivoNombre: nombre, archivoUrl: url }
        );
        setVehiculos((prev) => prev.map((v) => (v.id === vehiculoActualizado.id ? vehiculoActualizado : v)));
        modalDocs.setDato(vehiculoActualizado);
        mostrarToast("Documento adjuntado", { tipo: "success" });
      } catch (err) {
        mostrarToast(err.message || "No se pudo subir el documento.", { tipo: "error" });
      }
    });
  }

  const hayFiltrosEquipos = !!(filtroEmpresa || filtroCategoria || filtroEstadoEquipo || busqueda);
  const hayFiltrosVehiculos = !!(filtroEmpresa || filtroTipoUnidad || busqueda);
  const hayFiltrosAsignaciones = !!(filtroDestinatario || busqueda);

  // Asignaciones: por nombre de persona, DNI o placa (sin distinguir
  // tildes) y por Personas / Camiones. Pocos registros: se filtra acá.
  const asignacionesFiltradas = useMemo(() => {
    const q = normalizar(busquedaDebounced);
    return asignacionesActuales.filter(
      (g) => (!filtroDestinatario || g.tipo === filtroDestinatario) && (!q || normalizar(`${g.nombre} ${g.detalle}`).includes(q))
    );
  }, [asignacionesActuales, filtroDestinatario, busquedaDebounced]);

  // Agrupa los equipos por categoría (Escaleras, Guantes, Líneas de vida...)
  // en vez de mostrarlos todos mezclados en un solo grid. Usa el orden en
  // que llegaron las categorías para que las secciones salgan siempre
  // igual.
  const equiposPorCategoria = useMemo(
    () =>
      tipos
        .map(({ nombre }) => ({
          categoria: nombre,
          items: equipos.filter((eq) => eq.categoria === nombre),
        }))
        .filter((grupo) => grupo.items.length > 0),
    [equipos, tipos]
  );

  return {
    tab, cambiarTab,
    filtroEmpresa, setFiltroEmpresa,
    filtroCategoria, setFiltroCategoria,
    filtroEstadoEquipo, setFiltroEstadoEquipo,
    filtroTipoUnidad, setFiltroTipoUnidad,
    filtroDestinatario, setFiltroDestinatario,
    busqueda, setBusqueda,
    openNuevo,
    tipos, recargarTipos,

    // Asignaciones
    asignacionesFiltradas, cargandoAsignaciones, errorAsignaciones, recargarAsignaciones, hayFiltrosAsignaciones,

    // Equipos
    cargandoEquipos, errorEquipos, recargarEquipos,
    equiposPorCategoria, hayFiltrosEquipos,
    abrirInspeccion, handleDevolver, abrirRenovar, abrirReasignar: abrirAsignar, abrirBaja, handleCambiarEstado, abrirEditarFotos,

    // Vehículos
    cargandoVehiculos, errorVehiculos, recargarVehiculos,
    vehiculos, hayFiltrosVehiculos,

    // Estado de carga y error de las acciones
    guardando: acciones.ocupado("modal"),
    textoGuardando: (porDefecto) => acciones.texto("modal", porDefecto),
    errorAccion,
    equipoOcupado: (id) => acciones.ocupado(`equipo-${id}`),
    estadoDocumento: (id) => (acciones.ocupado(`documento-${id}`) ? acciones.texto(`documento-${id}`, "Subiendo archivo…") : null),

    // Modal: historial
    modalHistorial, cargandoHistorial, historialItems, historialAsignaciones,

    // Modal: nuevo equipo
    modalNuevo,
    fEquipo, setFEquipo, handleGuardarEquipo, errorEquipo,

    // Modal: nuevo vehículo
    fVehiculo, setFVehiculo, handleGuardarVehiculo, errorVehiculo, erroresDocumentos,

    // Modal: inspección
    modalInspeccion, contextoInspeccion, fInspeccion, setFInspeccion: (v) => { setFInspeccion(v); setErrorAccion(""); }, handleGuardarInspeccion,

    // Modal: renovar fechas (equipo vencido)

    // Modal: dar de baja
    modalBaja, motivoBaja, setMotivoBaja: (v) => { setMotivoBaja(v); setErrorMotivo(false); }, errorMotivo, handleConfirmarBaja,

    // Modal: asignar
    modalAsignar, destinatarios, cargandoDestinatarios, errorDestinatarios, cargarDestinatarios,
    destinoId, setDestinoId: (v) => { setDestinoId(v); setErrorAsignar(false); },
    errorAsignar, handleConfirmarAsignar,

    // Modal: mantenimiento
    modalMantenimiento, comentarioMantenimiento,
    setComentarioMantenimiento: (v) => { setComentarioMantenimiento(v); setErrorMantenimiento(false); },
    errorMantenimiento, handleConfirmarMantenimiento,

    // Modal: editar fotos
    modalFotos, fotosEditando, setFotosEditando, handleGuardarFotos,

    // Modal: documentos de vehículo
    modalDocs, handleSubirDocumento,

    // Modal: editar equipo / vehículo, y eliminar
    modalEditarEquipo, fEquipoEditar, setFEquipoEditar, errorEditarEquipo,
    abrirEditarEquipo, handleGuardarEdicionEquipo, handleEliminarEquipo,
    modalEditarVehiculo, fVehiculoEditar, setFVehiculoEditar, errorEditarVehiculo,
    abrirEditarVehiculo, handleGuardarEdicionVehiculo, handleEliminarVehiculo,
  };
}
