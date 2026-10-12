import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useModal } from "./useModal";
import * as contratosService from "../services/contratosService";
import * as rrhhService from "../services/rrhhService";
import { subirArchivo } from "../services/uploadsService";
import { useDebounce } from "./useDebounce";
import { useAsyncList } from "./useAsyncList";
import { useAccion } from "./useAccion";
import { useConfirm } from "../context/ConfirmContext";
import { useToast } from "../context/ToastContext";

export const ESTADO_LABEL_RRHH = {
  vigente: "Vigente",
  porvencer: "Por vencer",
  vencido: "Vencido",
  renovado: "Renovado",
  terminado: "Terminado",
};

function formContratoVacio() {
  return {
    dni: "",
    trabajador: "",
    empresa: "corevex",
    tipo: "Plazo fijo",
    fechaInicio: "",
    fechaFin: "",
    diasAnticipacion: 30,
    archivoNombre: "",
  };
}

function formCursoVacio() {
  return {
    dni: "",
    empresa: "corevex",
    tipo: "Curso",
    fechaInicio: "",
    fechaVencimiento: "",
    diasAnticipacion: 30,
    archivoNombre: "",
  };
}

// Toda la lógica de negocio de la página RRHH — antes vivía dentro de
// Rrhh.jsx mezclada con el JSX. Ahora la página solo arma la vista con
// lo que este hook le devuelve.
export function useRrhhManager() {
  const { confirmar } = useConfirm();
  const { mostrarToast } = useToast();
  const acciones = useAccion();
  const [tab, setTab] = useState("contratos"); // "contratos" | "cursos"
  const [modalOpen, setModalOpen] = useState(false);
  // null = creando uno nuevo, id = editando ese registro existente —
  // mismo patrón que ya usa Finanzas para Facturas.
  const [idEditando, setIdEditando] = useState(null);
  const modalDetalle = useModal(); // dato = contrato o curso seleccionado

  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [searchParams] = useSearchParams();
  const [busqueda, setBusqueda] = useState(searchParams.get("q") || "");
  const busquedaDebounced = useDebounce(busqueda, 400);

  const [fContrato, setFContrato] = useState(formContratoVacio());
  const [errorContrato, setErrorContrato] = useState("");
  const [archivoContratoSeleccionado, setArchivoContratoSeleccionado] = useState(null);

  const [fCurso, setFCurso] = useState(formCursoVacio());
  const [errorCurso, setErrorCurso] = useState("");
  const [archivoCursoSeleccionado, setArchivoCursoSeleccionado] = useState(null);

  // Lista de personal ya registrado (deriva de los contratos reales) —
  // se usa para el selector de "Trabajador" en Cursos/Fotocheck/EMO.
  // Independiente de `listaFiltrada` porque esta última respeta los
  // filtros de la tabla (empresa/estado/búsqueda) y acá siempre
  // necesitamos el personal completo, sin filtrar.
  const [trabajadoresRegistrados, setTrabajadoresRegistrados] = useState([]);

  async function cargarTrabajadoresRegistrados() {
    const nombres = await contratosService.listarTrabajadoresRegistrados();
    setTrabajadoresRegistrados(nombres);
  }

  useEffect(() => {
    cargarTrabajadoresRegistrados();
  }, []);

  // Se re-consulta al backend cuando cambia de pestaña o de filtro, en
  // vez de traer todo de antemano y filtrar en el cliente.
  const {
    data: listaFiltrada,
    setData: setLista,
    loading: cargando,
    error,
    reload,
  } = useAsyncList((signal) => {
    const params = { empresa: filtroEmpresa, estado: filtroEstado, q: busquedaDebounced, signal };
    return tab === "contratos" ? contratosService.listarContratos(params) : rrhhService.listarCursos(params);
  }, [tab, filtroEmpresa, filtroEstado, busquedaDebounced]);

  function cambiarTab(nuevoTab) {
    setTab(nuevoTab);
    setFiltroEstado("");
  }

  function openModal() {
    setIdEditando(null);
    if (tab === "contratos") {
      setFContrato(formContratoVacio());
      setErrorContrato("");
      setArchivoContratoSeleccionado(null);
    } else {
      setFCurso(formCursoVacio());
      setErrorCurso("");
      setArchivoCursoSeleccionado(null);
    }
    setModalOpen(true);
  }

  // El botón "Editar" de la tabla llama a esto — precarga el formulario
  // con los datos del registro existente en vez de empezar en blanco.
  function abrirEditar(item) {
    setIdEditando(item.id);
    if (tab === "contratos") {
      setFContrato({
        dni: item.dni,
        trabajador: item.trabajador,
        empresa: item.empresa,
        tipo: item.tipo,
        fechaInicio: item.fechaInicio || "",
        fechaFin: item.fechaFin || "",
        diasAnticipacion: item.diasAnticipacion ?? 30,
        archivoNombre: item.archivo ? "Documento ya adjunto" : "",
      });
      setErrorContrato("");
      setArchivoContratoSeleccionado(null);
    } else {
      setFCurso({
        dni: item.dni,
        empresa: item.empresa,
        tipo: item.tipo,
        fechaInicio: item.fechaInicio || "",
        fechaVencimiento: item.fechaVencimiento || "",
        diasAnticipacion: item.diasAnticipacion ?? 30,
        archivoNombre: item.archivo ? item.archivoNombre || "Archivo ya adjunto" : "",
      });
      setErrorCurso("");
      setArchivoCursoSeleccionado(null);
    }
    setModalOpen(true);
  }

  async function handleGuardarContrato(e) {
    e.preventDefault();
    if (!fContrato.dni || !fContrato.trabajador || !fContrato.fechaInicio || !fContrato.fechaFin) {
      setErrorContrato("Completa DNI, trabajador, fecha de inicio y fecha de fin.");
      return;
    }
    setErrorContrato("");
    await acciones.ejecutar("modal", async ({ subida, etapa }) => {
      try {
        let datos = fContrato;
        if (archivoContratoSeleccionado) {
          const { url, nombre } = await subirArchivo(archivoContratoSeleccionado, subida);
          datos = { ...fContrato, archivoNombre: nombre, archivoUrl: url };
          etapa(idEditando ? "Guardando…" : "Registrando…");
        }

        if (idEditando) {
          const actualizado = await contratosService.actualizarContrato(idEditando, datos);
          setLista((prev) => prev.map((c) => (c.id === actualizado.id ? actualizado : c)));
        } else {
          const nuevo = await contratosService.crearContrato(datos);
          setLista((prev) => [nuevo, ...prev]);
        }
        cargarTrabajadoresRegistrados(); // el trabajador recién registrado ya debe aparecer en Cursos
        setModalOpen(false);
        mostrarToast(idEditando ? "Contrato actualizado" : "Contrato registrado", { tipo: "success" });
      } catch (err) {
        // Ej. "Ya tiene un contrato de ese tipo en esta empresa" — el
        // backend ya valida esto, acá solo se muestra el mensaje.
        setErrorContrato(err.message || "No se pudo guardar el contrato.");
      }
    });
  }

  async function handleGuardarCurso(e) {
    e.preventDefault();
    if (!fCurso.dni || !fCurso.fechaInicio || !fCurso.fechaVencimiento) {
      setErrorCurso("Selecciona un trabajador, fecha de inicio y fecha de vencimiento.");
      return;
    }
    setErrorCurso("");
    await acciones.ejecutar("modal", async ({ subida, etapa }) => {
      try {
        // archivoNombre del formulario es solo para mostrar en el
        // dropzone — lo que se guarda es lo que devuelve la subida.
        const { archivoNombre: _soloVista, ...datosForm } = fCurso;
        let datos = datosForm;
        if (archivoCursoSeleccionado) {
          const { url, nombre } = await subirArchivo(archivoCursoSeleccionado, subida);
          datos = { ...datosForm, archivoNombre: nombre, archivoUrl: url };
          etapa(idEditando ? "Guardando…" : "Registrando…");
        }

        if (idEditando) {
          const actualizado = await rrhhService.actualizarCurso(idEditando, datos);
          setLista((prev) => prev.map((c) => (c.id === actualizado.id ? actualizado : c)));
        } else {
          const nuevo = await rrhhService.crearCurso(datos);
          setLista((prev) => [nuevo, ...prev]);
        }
        setModalOpen(false);
        mostrarToast(`${fCurso.tipo} ${idEditando ? "actualizado" : "registrado"}`, { tipo: "success" });
      } catch (err) {
        setErrorCurso(err.message || "No se pudo guardar el registro.");
      }
    });
  }

  async function handleEliminar(item) {
    const esContrato = tab === "contratos";
    const que = esContrato ? `el contrato ${item.tipo.toLowerCase()}` : item.tipo === "EMO" ? "el EMO" : `el ${item.tipo.toLowerCase()}`;
    const ok = await confirmar({
      titulo: `¿Eliminar ${que} de ${item.trabajador}?`,
      mensaje: `Se eliminará ${que} (vence ${item.vence})${item.archivo ? " junto con su documento adjunto" : ""} de forma permanente. Esta acción no se puede deshacer.`,
      tipo: "peligro",
      textoConfirmar: esContrato ? "Eliminar contrato" : `Eliminar ${item.tipo === "EMO" ? "EMO" : item.tipo.toLowerCase()}`,
      textoCargando: "Eliminando…",
      accion: async () => {
        if (esContrato) await contratosService.eliminarContrato(item.id);
        else await rrhhService.eliminarCurso(item.id);
        setLista((prev) => prev.filter((x) => x.id !== item.id));
      },
    });
    if (!ok) return;
    if (esContrato) cargarTrabajadoresRegistrados(); // quizá ya no tiene contrato en ninguna empresa
    mostrarToast(esContrato ? "Contrato eliminado" : `${item.tipo} eliminado`, { tipo: "success" });
  }


  function handleArchivoChange(e) {
    const file = e.target.files?.[0];
    setArchivoContratoSeleccionado(file || null);
    setFContrato((f) => ({ ...f, archivoNombre: file ? file.name : "" }));
  }

  function handleArchivoCursoChange(e) {
    const file = e.target.files?.[0];
    setArchivoCursoSeleccionado(file || null);
    setFCurso((f) => ({ ...f, archivoNombre: file ? file.name : "" }));
  }

  // "Adjuntar" desde la tabla, en cualquiera de las 2 pestañas. Antes
  // no tenía try/catch: si la subida fallaba (archivo muy pesado, tipo
  // no permitido) no se le mostraba nada al usuario.
  // La clave lleva el id: cada fila muestra su propio "Subiendo… 40%"
  // y se pueden adjuntar archivos a varias filas a la vez.
  async function handleAdjuntarArchivo(item, archivo) {
    await acciones.ejecutar(`adjuntar-${item.id}`, async ({ subida }) => {
      try {
        const actualizado =
          tab === "contratos"
            ? await contratosService.adjuntarArchivoContrato(item.id, archivo, subida)
            : await rrhhService.adjuntarArchivoCurso(item.id, archivo, subida);
        setLista((prev) => prev.map((c) => (c.id === actualizado.id ? actualizado : c)));
        mostrarToast("Archivo adjuntado", { tipo: "success" });
      } catch (err) {
        mostrarToast(err.message || "No se pudo adjuntar el archivo.", { tipo: "error" });
      }
    });
  }

  const hayFiltrosActivos = !!(filtroEmpresa || filtroEstado || busqueda);

  return {
    tab, cambiarTab,
    modalOpen, openModal, abrirEditar, idEditando,
    cerrarModal: () => { setModalOpen(false); setIdEditando(null); },
    guardando: acciones.ocupado("modal"),
    textoGuardando: acciones.texto("modal", idEditando ? "Guardando…" : "Registrando…"),
    estadoAdjunto: (id) => (acciones.ocupado(`adjuntar-${id}`) ? acciones.texto(`adjuntar-${id}`, "Subiendo archivo…") : null),
    modalDetalle,
    filtroEmpresa, setFiltroEmpresa,
    filtroEstado, setFiltroEstado,
    busqueda, setBusqueda,
    cargando, error, reload,
    listaFiltrada, hayFiltrosActivos,
    fContrato, setFContrato, errorContrato, handleGuardarContrato, handleArchivoChange,
    fCurso, setFCurso, errorCurso, handleGuardarCurso, handleArchivoCursoChange,
    trabajadoresRegistrados,
    handleAdjuntarArchivo,
    handleEliminar,
  };
}
