import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import * as equiposService from "../services/equiposService";
import * as vehiculosService from "../services/vehiculosService";
import { subirArchivo } from "../services/uploadsService";
import { useDebounce } from "./useDebounce";
import { useAsyncList } from "./useAsyncList";
import { useModal } from "./useModal";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";

function formEquipoVacio() {
  return {
    codigo: "",
    categoria: "Escaleras Embonables",
    empresa: "corevex",
    camposValores: {},
    fotos: [null, null],
  };
}

function formVehiculoVacio() {
  return { placa: "", tipoUnidad: "Camioneta", empresa: "corevex", cuadrilla: "" };
}

function formInspeccionVacio() {
  return { tipo: "interna", fechaInspeccion: "", fechaVencimiento: "", diasAnticipacion: 30, resultado: "aprobado" };
}

// Toda la lógica de negocio de la página Operaciones — antes vivía
// dentro de Operaciones.jsx mezclada con el JSX de las 2 pestañas
// (Equipos/Vehículos) y sus 8 modales. Ahora la página solo arma la
// vista con lo que este hook le devuelve.
export function useOperacionesManager() {
  const { mostrarToast } = useToast();
  const { confirmar, alertar } = useConfirm();
  const [tab, setTab] = useState("equipos"); // "equipos" | "vehiculos"
  const [errorEquipo, setErrorEquipo] = useState("");
  const [errorVehiculo, setErrorVehiculo] = useState("");
  const [historialItems, setHistorialItems] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroEstadoEquipo, setFiltroEstadoEquipo] = useState("");
  const [filtroTipoUnidad, setFiltroTipoUnidad] = useState("");
  const [searchParams] = useSearchParams();
  const [busqueda, setBusqueda] = useState(searchParams.get("q") || "");
  const busquedaDebounced = useDebounce(busqueda, 400);

  // Categorías de equipo — antes era un objeto fijo importado
  // (CATEGORIAS), ahora vive en la base de datos y hay que pedirlo.
  // Se carga una vez al montar y se refresca cada vez que se agrega
  // una categoría nueva desde el modal de Nuevo equipo.
  const [categorias, setCategorias] = useState({});
  async function cargarCategorias() {
    const datos = await equiposService.listarCategorias();
    setCategorias(datos);
  }
  useEffect(() => {
    cargarCategorias();
  }, []);

  const [modalCategoriasEquipo, setModalCategoriasEquipo] = useState(false);

  async function handleRenombrarCategoria(nombreActual, nombreNuevo) {
    const campos = categorias[nombreActual] || [];
    const nombreFinal = await equiposService.actualizarCategoria(nombreActual, nombreNuevo, campos);
    setCategorias((prev) => {
      const { [nombreActual]: camposViejos, ...resto } = prev;
      return { ...resto, [nombreFinal]: campos };
    });
  }

  async function handleEliminarCategoria(nombre) {
    await equiposService.eliminarCategoria(nombre);
    setCategorias((prev) => {
      const { [nombre]: _eliminada, ...resto } = prev;
      return resto;
    });
  }

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
  const [fEquipoEditar, setFEquipoEditar] = useState({ codigo: "", categoria: "", camposValores: {} });
  const [errorEditarEquipo, setErrorEditarEquipo] = useState("");
  const [errorCodigo, setErrorCodigo] = useState(false);

  // ---- Categoría nueva (dentro del modal de Nuevo equipo) ----
  const [nuevaCategoria, setNuevaCategoria] = useState(false);
  const [nombreNuevaCategoria, setNombreNuevaCategoria] = useState("");
  const [camposNuevaCategoria, setCamposNuevaCategoria] = useState([{ id: crypto.randomUUID(), nombre: "", placeholder: "" }]);
  const [errorCategoria, setErrorCategoria] = useState("");

  const [fVehiculo, setFVehiculo] = useState(formVehiculoVacio());
  const [fVehiculoEditar, setFVehiculoEditar] = useState({ placa: "", cuadrilla: "" });
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

  const codigosExistentes = useMemo(() => equipos.map((e) => e.codigo), [equipos]);

  // Trae la hoja de vida (equipo o vehículo) recién cuando se abre el
  // modal, no de antemano para todos los registros.
  useEffect(() => {
    if (!modalHistorial.dato) return;
    setCargandoHistorial(true);
    const obtener = modalHistorial.dato.codigo
      ? equiposService.obtenerHojaDeVida(modalHistorial.dato.codigo)
      : vehiculosService.obtenerHistorial(modalHistorial.dato.placa);
    obtener
      .then(setHistorialItems)
      .catch(() => setHistorialItems([]))
      .finally(() => setCargandoHistorial(false));
  }, [modalHistorial.dato]);

  function checkCodigo(valor) {
    setFEquipo((f) => ({ ...f, codigo: valor }));
    setErrorCodigo(codigosExistentes.includes(valor.trim()));
  }

  function cambiarTab(nuevoTab) {
    setTab(nuevoTab);
    setFiltroCategoria("");
    setFiltroEstadoEquipo("");
    setFiltroTipoUnidad("");
  }

  function openNuevo() {
    if (tab === "equipos") {
      setFEquipo(formEquipoVacio());
      setErrorCodigo(false);
      setErrorEquipo("");
      setNuevaCategoria(false);
      setNombreNuevaCategoria("");
      setCamposNuevaCategoria([{ id: crypto.randomUUID(), nombre: "", placeholder: "" }]);
      setErrorCategoria("");
    } else {
      setFVehiculo(formVehiculoVacio());
      setErrorVehiculo("");
    }
    modalNuevo.abrir();
  }

  async function handleGuardarEquipo(e) {
    e.preventDefault();
    if (!fEquipo.codigo.trim() || errorCodigo) return;
    setErrorEquipo("");

    try {
      let categoriaFinal = fEquipo.categoria;
      if (nuevaCategoria) {
        if (!nombreNuevaCategoria.trim()) {
          setErrorCategoria("Ponle un nombre a la categoría.");
          return;
        }
        if (categorias[nombreNuevaCategoria.trim()]) {
          setErrorCategoria("Ya existe una categoría con ese nombre.");
          return;
        }
        if (!camposNuevaCategoria.some((c) => c.nombre.trim())) {
          setErrorCategoria("Agrega al menos un campo para esta categoría.");
          return;
        }
        categoriaFinal = await equiposService.agregarCategoria(nombreNuevaCategoria, camposNuevaCategoria);
        await cargarCategorias(); // para que ya aparezca en el select la próxima vez
      }

      // El backend valida de nuevo el código único (nunca confiar solo en
      // la validación del frontend) y crea el equipo con estado DISPONIBLE.
      const nuevo = await equiposService.crearEquipo({ ...fEquipo, categoria: categoriaFinal });
      setEquipos((prev) => [nuevo, ...prev]);
      modalNuevo.cerrar();
    } catch (err) {
      setErrorEquipo(err.message || "No se pudo guardar el equipo.");
    }
  }

  async function handleGuardarVehiculo(e) {
    e.preventDefault();
    if (!fVehiculo.placa.trim()) return;
    setErrorVehiculo("");
    try {
      const nuevo = await vehiculosService.crearVehiculo(fVehiculo);
      setVehiculos((prev) => [nuevo, ...prev]);
      modalNuevo.cerrar();
    } catch (err) {
      setErrorVehiculo(err.message || "No se pudo guardar el vehículo.");
    }
  }

  async function handleGuardarInspeccion(e) {
    e.preventDefault();
    try {
      // El backend hace esto como una sola operación atómica: registra la
      // inspección Y cambia el estado según el resultado (antes eran 2
      // llamadas separadas del lado del frontend, con el riesgo de quedar
      // desincronizadas si la segunda fallaba).
      const actualizado = await equiposService.registrarInspeccion(modalInspeccion.dato.id, fInspeccion);
      setEquipos((prev) => prev.map((eq) => (eq.id === actualizado.id ? actualizado : eq)));
      modalInspeccion.cerrar();
    } catch (err) {
      mostrarToast(err.message || "No se pudo registrar la inspección.", { tipo: "error" });
    }
  }

  async function handleConfirmarBaja() {
    if (!motivoBaja.trim()) {
      setErrorMotivo(true);
      return;
    }
    try {
      const actualizado = await equiposService.darDeBajaEquipo(modalBaja.dato.id, motivoBaja);
      setEquipos((prev) => prev.map((eq) => (eq.id === actualizado.id ? actualizado : eq)));
      modalBaja.cerrar();
      setMotivoBaja("");
    } catch (err) {
      mostrarToast(err.message || "No se pudo dar de baja el equipo.", { tipo: "error" });
    }
  }

  async function handleDevolver(eq) {
    try {
      const actualizado = await equiposService.devolverEquipo(eq.id);
      setEquipos((prev) => prev.map((e) => (e.id === actualizado.id ? actualizado : e)));
    } catch (err) {
      mostrarToast(err.message || "No se pudo devolver el equipo.", { tipo: "error" });
    }
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
    try {
      const actualizado = await equiposService.cambiarEstadoEquipo(eq.id, nuevoEstado);
      setEquipos((prev) => prev.map((e) => (e.id === actualizado.id ? actualizado : e)));
    } catch (err) {
      mostrarToast(err.message || "No se pudo cambiar el estado del equipo.", { tipo: "error" });
    }
  }

  function abrirAsignar(eq) {
    setVehiculoIdAsignar("");
    setErrorAsignar(false);
    modalAsignar.abrir(eq);
  }

  async function handleConfirmarAsignar() {
    if (!vehiculoIdAsignar) {
      setErrorAsignar(true);
      return;
    }
    try {
      const vehiculo = vehiculos.find((v) => String(v.id) === String(vehiculoIdAsignar));
      const actualizado = await equiposService.asignarEquipo(modalAsignar.dato.id, vehiculo);
      setEquipos((prev) => prev.map((e) => (e.id === actualizado.id ? actualizado : e)));
      modalAsignar.cerrar();
    } catch (err) {
      mostrarToast(err.message || "No se pudo asignar el equipo.", { tipo: "error" });
    }
  }

  function abrirMantenimiento(eq) {
    setComentarioMantenimiento("");
    setErrorMantenimiento(false);
    modalMantenimiento.abrir(eq);
  }

  async function handleConfirmarMantenimiento() {
    if (!comentarioMantenimiento.trim()) {
      setErrorMantenimiento(true);
      return;
    }
    try {
      const actualizado = await equiposService.enviarAMantenimiento(modalMantenimiento.dato.id, comentarioMantenimiento);
      setEquipos((prev) => prev.map((e) => (e.id === actualizado.id ? actualizado : e)));
      modalMantenimiento.cerrar();
    } catch (err) {
      mostrarToast(err.message || "No se pudo enviar el equipo a mantenimiento.", { tipo: "error" });
    }
  }

  function abrirEditarFotos(eq) {
    setFotosEditando(eq.fotos && eq.fotos.length > 0 ? [eq.fotos[0] || null, eq.fotos[1] || null] : [null, null]);
    modalFotos.abrir(eq);
  }

  async function handleGuardarFotos() {
    try {
      const actualizado = await equiposService.actualizarFotosEquipo(modalFotos.dato.id, fotosEditando);
      setEquipos((prev) => prev.map((e) => (e.id === actualizado.id ? actualizado : e)));
      modalFotos.cerrar();
    } catch (err) {
      mostrarToast(err.message || "No se pudieron guardar las fotos.", { tipo: "error" });
    }
  }

  function abrirEditarEquipo(eq) {
    setFEquipoEditar({ codigo: eq.codigo, categoria: eq.categoria, camposValores: eq.camposValores || {} });
    setErrorEditarEquipo("");
    modalEditarEquipo.abrir(eq);
  }

  async function handleGuardarEdicionEquipo(e) {
    e.preventDefault();
    setErrorEditarEquipo("");
    try {
      const actualizado = await equiposService.actualizarEquipo(modalEditarEquipo.dato.id, fEquipoEditar);
      setEquipos((prev) => prev.map((eq) => (eq.id === actualizado.id ? actualizado : eq)));
      modalEditarEquipo.cerrar();
    } catch (err) {
      setErrorEditarEquipo(err.message || "No se pudo guardar los cambios.");
    }
  }

  async function handleEliminarEquipo(eq) {
    const seguro = await confirmar(`¿Eliminar el equipo ${eq.codigo}? Esta acción no se puede deshacer.`, { tipo: "peligro" });
    if (!seguro) return;
    try {
      await equiposService.eliminarEquipo(eq.id);
      setEquipos((prev) => prev.filter((x) => x.id !== eq.id));
    } catch (err) {
      alertar(err.message || "No se pudo eliminar el equipo.");
    }
  }

  function abrirEditarVehiculo(v) {
    setFVehiculoEditar({ placa: v.placa, cuadrilla: v.cuadrilla || "" });
    setErrorEditarVehiculo("");
    modalEditarVehiculo.abrir(v);
  }

  async function handleGuardarEdicionVehiculo(e) {
    e.preventDefault();
    setErrorEditarVehiculo("");
    try {
      const actualizado = await vehiculosService.actualizarVehiculo(modalEditarVehiculo.dato.id, fVehiculoEditar);
      setVehiculos((prev) => prev.map((v) => (v.id === actualizado.id ? actualizado : v)));
      modalEditarVehiculo.cerrar();
    } catch (err) {
      setErrorEditarVehiculo(err.message || "No se pudo guardar los cambios.");
    }
  }

  async function handleEliminarVehiculo(v) {
    const seguro = await confirmar(`¿Eliminar el vehículo ${v.placa}? Esta acción no se puede deshacer.`, { tipo: "peligro" });
    if (!seguro) return;
    try {
      await vehiculosService.eliminarVehiculo(v.id);
      setVehiculos((prev) => prev.filter((x) => x.id !== v.id));
    } catch (err) {
      alertar(err.message || "No se pudo eliminar el vehículo.");
    }
  }

  function abrirInspeccion(eq) {
    setFInspeccion(formInspeccionVacio());
    modalInspeccion.abrir(eq);
  }

  function abrirBaja(eq) {
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
    try {
      const { url, nombre } = await subirArchivo(archivo);
      const vehiculoActualizado = await vehiculosService.actualizarDocumento(
        modalDocs.dato.id,
        documentoId,
        { archivoNombre: nombre, archivoUrl: url }
      );
      setVehiculos((prev) => prev.map((v) => (v.id === vehiculoActualizado.id ? vehiculoActualizado : v)));
      modalDocs.setDato(vehiculoActualizado);
    } catch (err) {
      mostrarToast(err.message || "No se pudo subir el documento.", { tipo: "error" });
    }
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
      Object.keys(categorias)
        .map((categoria) => ({
          categoria,
          items: equipos.filter((eq) => eq.categoria === categoria),
        }))
        .filter((grupo) => grupo.items.length > 0),
    [equipos, categorias]
  );

  return {
    tab, cambiarTab,
    filtroEmpresa, setFiltroEmpresa,
    filtroCategoria, setFiltroCategoria,
    filtroEstadoEquipo, setFiltroEstadoEquipo,
    filtroTipoUnidad, setFiltroTipoUnidad,
    busqueda, setBusqueda,
    openNuevo,
    categorias,

    // Equipos
    cargandoEquipos, errorEquipos, recargarEquipos,
    equiposPorCategoria, hayFiltrosEquipos,
    abrirInspeccion, handleDevolver, abrirBaja, handleCambiarEstado, abrirEditarFotos,

    // Vehículos
    cargandoVehiculos, errorVehiculos, recargarVehiculos,
    vehiculos, hayFiltrosVehiculos,

    // Modal: historial
    modalHistorial, cargandoHistorial, historialItems,

    // Modal: nuevo equipo
    modalNuevo,
    fEquipo, setFEquipo, errorCodigo, checkCodigo, handleGuardarEquipo, errorEquipo,
    nuevaCategoria, setNuevaCategoria,
    nombreNuevaCategoria, setNombreNuevaCategoria,
    camposNuevaCategoria, setCamposNuevaCategoria,
    errorCategoria,

    // Modal: nuevo vehículo
    fVehiculo, setFVehiculo, handleGuardarVehiculo, errorVehiculo,

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

    // Gestionar categorías de equipo
    modalCategoriasEquipo, setModalCategoriasEquipo,
    handleRenombrarCategoria, handleEliminarCategoria,
  };
}
