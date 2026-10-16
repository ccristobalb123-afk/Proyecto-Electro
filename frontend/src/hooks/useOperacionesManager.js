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
import { valoresEquipoVacios, valoresParaEnviar } from "../components/operaciones/camposEquipo";

// Sin tipo preelegido: al elegirlo aparecen solo sus campos.
function formEquipoVacio() {
  return { categoria: "", empresa: "corevex", valores: valoresEquipoVacios(), fotos: [null, null] };
}

function formVehiculoVacio() {
  return { placa: "", tipoUnidad: "Camioneta", empresa: "corevex", cuadrilla: "", documentos: vehiculosService.documentosFormVacios() };
}

function formInspeccionVacio() {
  return { tipo: "interna", fechaInspeccion: "", fechaVencimiento: "", diasAnticipacion: 15, resultado: "aprobado" };
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
  const [tab, setTab] = useState(searchParams.get("tab") === "vehiculos" ? "vehiculos" : "equipos"); // "equipos" | "vehiculos"
  const [errorEquipo, setErrorEquipo] = useState("");
  const [errorVehiculo, setErrorVehiculo] = useState("");
  const [historialItems, setHistorialItems] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroEstadoEquipo, setFiltroEstadoEquipo] = useState("");
  const [filtroTipoUnidad, setFiltroTipoUnidad] = useState("");
  const [busqueda, setBusqueda] = useState(searchParams.get("q") || "");
  const busquedaDebounced = useDebounce(busqueda, 400);

  // Tipos de equipo con sus campos obligatorios — los manda el backend
  // (src/lib/tiposEquipo.js), en el orden de la tabla. Ya no se crean ni
  // editan categorías desde la aplicación.
  const [tipos, setTipos] = useState([]);
  useEffect(() => {
    equiposService.listarCategorias().then(setTipos).catch(() => setTipos([]));
  }, []);

  // ---- Modales ----
  const modalNuevo = useModal();
  const modalHistorial = useModal(); // equipo|vehiculo seleccionado
  const modalInspeccion = useModal(); // equipo seleccionado
  const modalBaja = useModal(); // equipo seleccionado
  const modalAsignar = useModal(); // equipo seleccionado
  const modalMantenimiento = useModal(); // equipo seleccionado
  const modalFotos = useModal(); // equipo seleccionado
  const [fotosEditando, setFotosEditando] = useState([null, null]);
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
  const [vehiculoIdAsignar, setVehiculoIdAsignar] = useState("");
  const [errorAsignar, setErrorAsignar] = useState(false);
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

  // Trae la hoja de vida (equipo o vehículo) recién cuando se abre el
  // modal, no de antemano para todos los registros.
  useEffect(() => {
    if (!modalHistorial.dato) return;
    setCargandoHistorial(true);
    // Por id: los equipos sin código (arnés, estrobos...) también tienen hoja de vida.
    const obtener = modalHistorial.dato.placa
      ? vehiculosService.obtenerHistorial(modalHistorial.dato.placa)
      : equiposService.obtenerHojaDeVida(modalHistorial.dato.id);
    obtener
      .then(setHistorialItems)
      .catch(() => setHistorialItems([]))
      .finally(() => setCargandoHistorial(false));
  }, [modalHistorial.dato]);

  function cambiarTab(nuevoTab) {
    setTab(nuevoTab);
    setFiltroCategoria("");
    setFiltroEstadoEquipo("");
    setFiltroTipoUnidad("");
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
    await acciones.ejecutar("modal", async () => {
      try {
        // El backend hace esto como una sola operación atómica: registra la
        // inspección Y cambia el estado según el resultado (antes eran 2
        // llamadas separadas del lado del frontend, con el riesgo de quedar
        // desincronizadas si la segunda fallaba).
        const actualizado = await equiposService.registrarInspeccion(modalInspeccion.dato.id, fInspeccion);
        setEquipos((prev) => prev.map((eq) => (eq.id === actualizado.id ? actualizado : eq)));
        modalInspeccion.cerrar();
        mostrarToast("Inspección registrada", { tipo: "success" });
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

  async function handleDevolver(eq) {
    await acciones.ejecutar(`equipo-${eq.id}`, async () => {
      try {
        const actualizado = await equiposService.devolverEquipo(eq.id);
        setEquipos((prev) => prev.map((e) => (e.id === actualizado.id ? actualizado : e)));
        mostrarToast(`Equipo ${eq.identificador} devuelto al almacén`, { tipo: "success" });
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
    if (nuevoEstado === "mantenimiento") {
      abrirMantenimiento(eq);
      return;
    }
    await acciones.ejecutar(`equipo-${eq.id}`, async () => {
      try {
        const actualizado = await equiposService.cambiarEstadoEquipo(eq.id, nuevoEstado);
        setEquipos((prev) => prev.map((e) => (e.id === actualizado.id ? actualizado : e)));
        mostrarToast("Estado actualizado", { tipo: "success" });
      } catch (err) {
        mostrarToast(err.message || "No se pudo cambiar el estado del equipo.", { tipo: "error" });
      }
    });
  }

  function abrirAsignar(eq) {
    setErrorAccion("");
    setVehiculoIdAsignar("");
    setErrorAsignar(false);
    modalAsignar.abrir(eq);
  }

  async function handleConfirmarAsignar() {
    setErrorAccion("");
    if (!vehiculoIdAsignar) {
      setErrorAsignar(true);
      return;
    }
    await acciones.ejecutar("modal", async () => {
      try {
        const vehiculo = vehiculos.find((v) => String(v.id) === String(vehiculoIdAsignar));
        const actualizado = await equiposService.asignarEquipo(modalAsignar.dato.id, vehiculo);
        setEquipos((prev) => prev.map((e) => (e.id === actualizado.id ? actualizado : e)));
        modalAsignar.cerrar();
        mostrarToast("Equipo asignado", { tipo: "success" });
      } catch (err) {
        setErrorAccion(err.message || "No se pudo asignar el equipo.");
      }
    });
  }

  function abrirMantenimiento(eq) {
    setErrorAccion("");
    setComentarioMantenimiento("");
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
        const actualizado = await equiposService.enviarAMantenimiento(modalMantenimiento.dato.id, comentarioMantenimiento);
        setEquipos((prev) => prev.map((e) => (e.id === actualizado.id ? actualizado : e)));
        modalMantenimiento.cerrar();
        mostrarToast("Equipo enviado a mantenimiento", { tipo: "success" });
      } catch (err) {
        setErrorAccion(err.message || "No se pudo enviar el equipo a mantenimiento.");
      }
    });
  }

  function abrirEditarFotos(eq) {
    setErrorAccion("");
    setFotosEditando(eq.fotos && eq.fotos.length > 0 ? [eq.fotos[0] || null, eq.fotos[1] || null] : [null, null]);
    modalFotos.abrir(eq);
  }

  async function handleGuardarFotos() {
    setErrorAccion("");
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


  function abrirInspeccion(eq) {
    setErrorAccion("");
    // Arranca con los días de aviso que ya tiene el equipo (15 si nunca
    // se cambiaron), no con un valor fijo.
    setFInspeccion({ ...formInspeccionVacio(), diasAnticipacion: eq.diasAnticipacionInspeccion ?? 15 });
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

  // Solo camiones registrados de la misma empresa dueña del equipo — así
  // no se puede asignar, por ejemplo, un equipo de Electro a un camión
  // que es de Corevex.
  const vehiculosParaAsignar = useMemo(
    () => (modalAsignar.dato ? vehiculos.filter((v) => v.empresaDueña === modalAsignar.dato.empresa) : []),
    [modalAsignar.dato, vehiculos]
  );

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
    busqueda, setBusqueda,
    openNuevo,
    tipos,

    // Equipos
    cargandoEquipos, errorEquipos, recargarEquipos,
    equiposPorCategoria, hayFiltrosEquipos,
    abrirInspeccion, handleDevolver, abrirBaja, handleCambiarEstado, abrirEditarFotos,

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
    modalHistorial, cargandoHistorial, historialItems,

    // Modal: nuevo equipo
    modalNuevo,
    fEquipo, setFEquipo, handleGuardarEquipo, errorEquipo,

    // Modal: nuevo vehículo
    fVehiculo, setFVehiculo, handleGuardarVehiculo, errorVehiculo, erroresDocumentos,

    // Modal: inspección
    modalInspeccion, fInspeccion, setFInspeccion, handleGuardarInspeccion,

    // Modal: dar de baja
    modalBaja, motivoBaja, setMotivoBaja: (v) => { setMotivoBaja(v); setErrorMotivo(false); }, errorMotivo, handleConfirmarBaja,

    // Modal: asignar
    modalAsignar, vehiculosParaAsignar,
    vehiculoIdAsignar, setVehiculoIdAsignar: (v) => { setVehiculoIdAsignar(v); setErrorAsignar(false); },
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
