import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useModal } from "./useModal";
import * as contratosService from "../services/contratosService";
import * as rrhhService from "../services/rrhhService";
import { subirArchivo } from "../services/uploadsService";
import { useDebounce } from "./useDebounce";
import { useAsyncList } from "./useAsyncList";
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
  };
}

// Toda la lógica de negocio de la página RRHH — antes vivía dentro de
// Rrhh.jsx mezclada con el JSX. Ahora la página solo arma la vista con
// lo que este hook le devuelve.
export function useRrhhManager() {
  const { confirmar, alertar } = useConfirm();
  const { mostrarToast } = useToast();
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
      });
      setErrorCurso("");
    }
    setModalOpen(true);
  }

  async function handleGuardarContrato(e) {
    e.preventDefault();
    if (!fContrato.dni || !fContrato.trabajador || !fContrato.fechaInicio || !fContrato.fechaFin) {
      setErrorContrato("Completa DNI, trabajador, fecha de inicio y fecha de fin.");
      return;
    }
    try {
      let datos = fContrato;
      if (archivoContratoSeleccionado) {
        const { url, nombre } = await subirArchivo(archivoContratoSeleccionado);
        datos = { ...fContrato, archivoNombre: nombre, archivoUrl: url };
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
    } catch (err) {
      // Ej. "Ya tiene un contrato de ese tipo en esta empresa" — el
      // backend ya valida esto, acá solo se muestra el mensaje.
      setErrorContrato(err.message);
    }
  }

  async function handleGuardarCurso(e) {
    e.preventDefault();
    if (!fCurso.dni || !fCurso.fechaInicio || !fCurso.fechaVencimiento) {
      setErrorCurso("Selecciona un trabajador, fecha de inicio y fecha de vencimiento.");
      return;
    }
    try {
      if (idEditando) {
        const actualizado = await rrhhService.actualizarCurso(idEditando, fCurso);
        setLista((prev) => prev.map((c) => (c.id === actualizado.id ? actualizado : c)));
      } else {
        const nuevo = await rrhhService.crearCurso(fCurso);
        setLista((prev) => [nuevo, ...prev]);
      }
      setModalOpen(false);
    } catch (err) {
      setErrorCurso(err.message);
    }
  }

  async function handleEliminar(item) {
    const etiqueta = tab === "contratos" ? `el contrato de ${item.trabajador}` : `el ${item.tipo.toLowerCase()} de ${item.trabajador}`;
    const seguro = await confirmar(`¿Eliminar ${etiqueta}? Esta acción no se puede deshacer.`, { tipo: "peligro" });
    if (!seguro) return;
    try {
      if (tab === "contratos") {
        await contratosService.eliminarContrato(item.id);
      } else {
        await rrhhService.eliminarCurso(item.id);
      }
      setLista((prev) => prev.filter((x) => x.id !== item.id));
    } catch (err) {
      alertar(err.message || "No se pudo eliminar.");
    }
  }

  function handleArchivoChange(e) {
    const file = e.target.files?.[0];
    setArchivoContratoSeleccionado(file || null);
    setFContrato((f) => ({ ...f, archivoNombre: file ? file.name : "" }));
  }

  async function handleAdjuntarArchivo(item, archivo) {
    const actualizado = await contratosService.adjuntarArchivoContrato(item.id, archivo);
    setLista((prev) => prev.map((c) => (c.id === actualizado.id ? actualizado : c)));
  }

  const hayFiltrosActivos = !!(filtroEmpresa || filtroEstado || busqueda);

  return {
    tab, cambiarTab,
    modalOpen, openModal, abrirEditar, idEditando,
    cerrarModal: () => { setModalOpen(false); setIdEditando(null); },
    modalDetalle,
    filtroEmpresa, setFiltroEmpresa,
    filtroEstado, setFiltroEstado,
    busqueda, setBusqueda,
    cargando, error, reload,
    listaFiltrada, hayFiltrosActivos,
    fContrato, setFContrato, errorContrato, handleGuardarContrato, handleArchivoChange,
    fCurso, setFCurso, errorCurso, handleGuardarCurso,
    trabajadoresRegistrados,
    handleAdjuntarArchivo,
    handleEliminar,
  };
}
