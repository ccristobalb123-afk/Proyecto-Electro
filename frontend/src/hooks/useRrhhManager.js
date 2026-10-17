import { useEffect, useMemo, useState } from "react";
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
    empresa: "", // se completa con la del contrato del trabajador
    tipo: "Curso",
    codigoCurso: "",
    nombreCurso: "",
    fechaInicio: "",
    fechaVencimiento: "",
    diasAnticipacion: 30,
    archivoNombre: "",
  };
}

// Cursos/EMO: lo que vence primero, arriba (mismo orden que el backend).
const ordenarPorVencimiento = (lista) =>
  [...lista].sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento) || a.id - b.id);

// Para buscar sin importar mayúsculas ni tildes ("José" = "jose").
const normalizar = (t) => (t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const inicialesDe = (nombre) =>
  nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");

// Toda la lógica de negocio de la página RRHH — antes vivía dentro de
// Rrhh.jsx mezclada con el JSX. Ahora la página solo arma la vista con
// lo que este hook le devuelve.
export function useRrhhManager() {
  const { confirmar } = useConfirm();
  const { mostrarToast } = useToast();
  const acciones = useAccion();
  // ?tab=cursos&q=<dni> — enlace directo desde un aviso de vencimiento
  // (campana, Dashboard o push).
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get("tab") === "cursos" ? "cursos" : "contratos"); // "contratos" | "cursos"
  const [modalOpen, setModalOpen] = useState(false);
  // null = creando uno nuevo, id = editando ese registro existente —
  // mismo patrón que ya usa Finanzas para Facturas.
  const [idEditando, setIdEditando] = useState(null);
  const modalDetalle = useModal(); // dato = contrato o curso seleccionado

  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [busqueda, setBusqueda] = useState(searchParams.get("q") || "");
  const busquedaDebounced = useDebounce(busqueda, 400);
  // Búsqueda que llegó en el enlace de un aviso (?tab=cursos&q=<dni>):
  // mientras no se cambie, abre la ficha de esa persona aunque coincida
  // solo por DNI (quien llega viene a ver ese aviso). La página se monta
  // de nuevo con cada enlace (key={search} en Rrhh.jsx).
  const [qDelEnlace] = useState(() => (searchParams.get("tab") === "cursos" ? (searchParams.get("q") || "").trim() : ""));

  const [fContrato, setFContrato] = useState(formContratoVacio());
  const [errorContrato, setErrorContrato] = useState("");
  const [archivoContratoSeleccionado, setArchivoContratoSeleccionado] = useState(null);

  const [fCurso, setFCurso] = useState(formCursoVacio());
  const [errorCurso, setErrorCurso] = useState("");
  const [archivoCursoSeleccionado, setArchivoCursoSeleccionado] = useState(null);
  // Persona de la ficha desde la que se abrió el formulario (su personal
  // queda fijo, sin selector). null = "Nuevo registro" general, con selector.
  const [personaCurso, setPersonaCurso] = useState(null);
  // "Curso X guardado…" tras "Guardar y agregar otro" (el formulario sigue abierto).
  const [avisoGuardadoCurso, setAvisoGuardadoCurso] = useState("");
  // Fichas que el usuario abrió o cerró a mano, para la búsqueda actual
  // (al cambiar la búsqueda vuelven a abrirse solas las que coinciden).
  const [aperturas, setAperturas] = useState({ q: "", porDni: {} });

  // Lista de personal ya registrado (deriva de los contratos reales) —
  // se usa para el selector de "Trabajador" en Cursos/EMO (con las
  // empresas donde cada uno tiene contrato).
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
    // Cursos / EMO se agrupan por persona: se traen todos y los filtros se
    // aplican sobre las personas (así el resumen de cada una está completo).
    return tab === "contratos" ? contratosService.listarContratos(params) : rrhhService.listarCursos({ signal });
  }, [tab, ...(tab === "contratos" ? [filtroEmpresa, filtroEstado, busquedaDebounced] : ["", "", ""])]);

  // ---- Cursos / EMO agrupados por persona ----
  // Todo el personal con contrato (aunque todavía no tenga cursos, para
  // poder agregárselos desde su ficha) más quien tenga registros.
  const gruposCursos = useMemo(() => {
    if (tab !== "cursos") return [];
    const porDni = new Map();
    for (const t of trabajadoresRegistrados) {
      porDni.set(t.dni, { personalId: t.id, dni: t.dni, nombre: t.nombre, empresasContrato: t.empresas, registros: [] });
    }
    for (const r of listaFiltrada) {
      if (!porDni.has(r.dni)) porDni.set(r.dni, { personalId: r.personalId, dni: r.dni, nombre: r.trabajador, empresasContrato: [], registros: [] });
      porDni.get(r.dni).registros.push(r);
    }
    const q = normalizar(busquedaDebounced.trim());
    const grupos = [];
    for (const base of porDni.values()) {
      const registros = ordenarPorVencimiento(base.registros);
      const g = {
        ...base,
        registros,
        iniciales: inicialesDe(base.nombre),
        empresas: [...new Set([...base.empresasContrato, ...registros.map((r) => r.empresa)])],
        tieneContrato: base.empresasContrato.length > 0,
      };
      if (filtroEmpresa && !g.empresas.includes(filtroEmpresa)) continue;
      if (filtroEstado && !registros.some((r) => r.estado === filtroEstado)) continue;
      // Coincidencias: en la persona (nombre o DNI) o en sus registros
      // (código o nombre del curso, o "EMO" como tipo de registro). Solo
      // las de un registro abren la ficha y resaltan ese registro.
      g.coincidencias = new Set();
      if (q) {
        const enPersona = normalizar(g.nombre).includes(q) || g.dni.includes(q);
        for (const r of registros) {
          const enRegistro = r.tipo === "EMO" ? q === "emo" : normalizar(r.codigoCurso).includes(q) || normalizar(r.nombreCurso).includes(q);
          if (enRegistro) g.coincidencias.add(r.id);
        }
        if (!enPersona && g.coincidencias.size === 0) continue;
      }
      const cursos = registros.filter((r) => r.tipo === "Curso");
      g.resumen = {
        cursos: cursos.length,
        vencidos: cursos.filter((r) => r.estado === "vencido").length,
        porVencer: cursos.filter((r) => r.estado === "porvencer").length,
        emo: registros.find((r) => r.tipo === "EMO")?.estado ?? null,
      };
      grupos.push(g);
    }
    // Primero quien tiene algo por vencer antes; sin registros, al final.
    const proximo = (g) => g.registros[0]?.fechaVencimiento ?? "9999-12-31";
    return grupos.sort((a, b) => proximo(a).localeCompare(proximo(b)) || a.nombre.localeCompare(b.nombre, "es"));
  }, [tab, trabajadoresRegistrados, listaFiltrada, filtroEmpresa, filtroEstado, busquedaDebounced]);

  // Abierta: lo que el usuario eligió para esta búsqueda o, si no tocó
  // nada, abierta cuando la búsqueda coincide con alguno de sus registros
  // (no solo con su nombre o DNI) o cuando viene del enlace de un aviso.
  const fichaAbierta = (dni) => {
    const manual = aperturas.q === busquedaDebounced ? aperturas.porDni[dni] : undefined;
    if (manual !== undefined) return manual;
    const q = busquedaDebounced.trim();
    if (!q) return false;
    if (qDelEnlace && q === qDelEnlace) return true;
    return (gruposCursos.find((g) => g.dni === dni)?.coincidencias.size ?? 0) > 0;
  };
  function fijarFicha(dni, abierta) {
    setAperturas((prev) => ({
      q: busquedaDebounced,
      porDni: { ...(prev.q === busquedaDebounced ? prev.porDni : {}), [dni]: abierta },
    }));
  }

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
      setPersonaCurso(null);
      setAvisoGuardadoCurso("");
    }
    setModalOpen(true);
  }

  // "Agregar curso" / "Registrar EMO" desde la ficha: la persona ya está
  // elegida y no se puede cambiar; la empresa sale de su contrato.
  function abrirCursoEnFicha(persona, tipo) {
    setIdEditando(null);
    setPersonaCurso(persona);
    setFCurso({
      ...formCursoVacio(),
      tipo,
      dni: persona.dni,
      empresa: persona.empresasContrato.length === 1 ? persona.empresasContrato[0] : "",
    });
    setErrorCurso("");
    setAvisoGuardadoCurso("");
    setArchivoCursoSeleccionado(null);
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
        codigoCurso: item.codigoCurso || "",
        nombreCurso: item.nombreCurso || "",
        fechaInicio: item.fechaInicio || "",
        fechaVencimiento: item.fechaVencimiento || "",
        diasAnticipacion: item.diasAnticipacion ?? 30,
        archivoNombre: item.archivo ? item.archivoNombre || "Archivo ya adjunto" : "",
      });
      setErrorCurso("");
      setArchivoCursoSeleccionado(null);
      setAvisoGuardadoCurso("");
      // Se edita desde la ficha: la persona del registro queda fija.
      const grupo = gruposCursos.find((g) => g.dni === item.dni);
      setPersonaCurso(
        grupo || { personalId: item.personalId, dni: item.dni, nombre: item.trabajador, empresasContrato: trabajadoresRegistrados.find((t) => t.dni === item.dni)?.empresas || [] }
      );
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
    // "Guardar y agregar otro": guarda y deja el formulario abierto para el
    // siguiente curso de la misma persona.
    const otro = e.nativeEvent?.submitter?.value === "otro";
    if (!fCurso.dni || !fCurso.fechaInicio || !fCurso.fechaVencimiento) {
      setErrorCurso("Selecciona un trabajador, fecha de inicio y fecha de vencimiento.");
      return;
    }
    if (fCurso.tipo === "Curso" && (!fCurso.codigoCurso.trim() || !fCurso.nombreCurso.trim())) {
      setErrorCurso("Completa el código y el nombre del curso.");
      return;
    }
    const empresasTrabajador = trabajadoresRegistrados.find((t) => t.dni === fCurso.dni)?.empresas || [];
    if (empresasTrabajador.length > 1 && !fCurso.empresa) {
      setErrorCurso("Elige a qué empresa corresponde este registro.");
      return;
    }
    if (fCurso.fechaVencimiento < fCurso.fechaInicio) {
      setErrorCurso("La fecha de vencimiento no puede ser anterior a la fecha de inicio.");
      return;
    }
    setErrorCurso("");
    setAvisoGuardadoCurso("");
    await acciones.ejecutar("modal", async ({ subida, etapa }) => {
      try {
        // archivoNombre del formulario es solo para mostrar en el
        // dropzone — lo que se guarda es lo que devuelve la subida.
        // Sin empresa elegida, el backend usa la del contrato.
        // EMO no lleva código ni nombre de curso (el backend igual los ignora).
        // Quién: el id de la ficha, o el DNI del selector. Al editar, el
        // backend usa siempre la persona del registro.
        const { archivoNombre: _soloVista, empresa, codigoCurso, nombreCurso, dni, ...base } = fCurso;
        const quien = idEditando ? {} : personaCurso ? { personalId: personaCurso.personalId } : { dni };
        const resto = fCurso.tipo === "Curso" ? { ...base, ...quien, codigoCurso, nombreCurso } : { ...base, ...quien };
        const datosForm = empresa ? { ...resto, empresa } : resto;
        let datos = datosForm;
        if (archivoCursoSeleccionado) {
          const { url, nombre } = await subirArchivo(archivoCursoSeleccionado, subida);
          datos = { ...datosForm, archivoNombre: nombre, archivoUrl: url };
          etapa(idEditando ? "Guardando…" : "Registrando…");
        }

        // La lista va ordenada por vencimiento (como la devuelve el backend):
        // una renovación (fechas nuevas) cambia de lugar.
        const guardado = idEditando ? await rrhhService.actualizarCurso(idEditando, datos) : await rrhhService.crearCurso(datos);
        setLista((prev) => ordenarPorVencimiento([guardado, ...prev.filter((c) => c.id !== guardado.id)]));
        // La ficha de esa persona queda abierta, con su resumen actualizado.
        fijarFicha(guardado.dni, true);
        if (otro) {
          setFCurso((f) => ({ ...formCursoVacio(), tipo: f.tipo, dni: f.dni, empresa: f.empresa }));
          setArchivoCursoSeleccionado(null);
          setAvisoGuardadoCurso(`Curso ${guardado.codigoCurso} guardado. Agrega el siguiente curso de ${guardado.trabajador}.`);
          return;
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
    const que = esContrato
      ? `el contrato ${item.tipo.toLowerCase()}`
      : item.tipo === "EMO"
        ? "el EMO"
        : item.nombreCurso
          ? `el curso ${item.nombreCurso} (${item.codigoCurso})`
          : `el ${item.tipo.toLowerCase()}`;
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
    faltantesCurso: tab === "cursos" && idEditando ? listaFiltrada.find((c) => c.id === idEditando)?.faltantes || [] : [],
    personaCurso, avisoGuardadoCurso, abrirCursoEnFicha,
    gruposCursos, fichaAbierta, fijarFicha,
    trabajadoresRegistrados,
    handleAdjuntarArchivo,
    handleEliminar,
  };
}
