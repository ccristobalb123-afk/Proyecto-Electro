import { useState } from "react";
import { AppShell } from "../components/layout/AppShell";
import { IconPlus } from "../components/icons/Icons";
import * as contratosService from "../services/contratosService";
import * as rrhhService from "../services/rrhhService";
import { useDebounce } from "../hooks/useDebounce";
import { useAsyncList } from "../hooks/useAsyncList";
import TablaRrhh from "../components/rrhh/TablaRrhh";
import ModalNuevoContrato from "../components/rrhh/ModalNuevoContrato";
import ModalNuevoCurso from "../components/rrhh/ModalNuevoCurso";
import "./Rrhh.css";

const ESTADO_LABEL = {
  vigente: "Vigente",
  porvencer: "Por vencer",
  vencido: "Vencido",
  renovado: "Renovado",
  terminado: "Terminado",
};

export default function Rrhh() {
  const [tab, setTab] = useState("contratos"); // "contratos" | "cursos"
  const [modalOpen, setModalOpen] = useState(false);

  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const busquedaDebounced = useDebounce(busqueda, 400);

  // ---- Formulario Contrato ----
  const [fContrato, setFContrato] = useState({
    trabajador: "",
    empresa: "corevex",
    tipo: "Plazo fijo",
    fechaInicio: "",
    fechaFin: "",
    diasAnticipacion: 30,
    archivoNombre: "",
  });
  const [errorContrato, setErrorContrato] = useState("");

  // ---- Formulario Curso/Fotocheck/EMO ----
  const [fCurso, setFCurso] = useState({
    trabajador: "",
    empresa: "corevex",
    tipo: "Curso",
    fechaInicio: "",
    fechaVencimiento: "",
    diasAnticipacion: 30,
  });
  const [errorCurso, setErrorCurso] = useState("");

  // Se re-consulta al backend cuando cambia de pestaña o de filtro, en
  // vez de traer todo de antemano y filtrar en el cliente.
  const {
    data: listaFiltrada,
    setData: setLista,
    loading: cargando,
    error,
    reload,
  } = useAsyncList(() => {
    const params = { empresa: filtroEmpresa, estado: filtroEstado, q: busquedaDebounced };
    return tab === "contratos" ? contratosService.listarContratos(params) : rrhhService.listarCursos(params);
  }, [tab, filtroEmpresa, filtroEstado, busquedaDebounced]);

  function resetFormContrato() {
    setFContrato({
      trabajador: "",
      empresa: "corevex",
      tipo: "Plazo fijo",
      fechaInicio: "",
      fechaFin: "",
      diasAnticipacion: 30,
      archivoNombre: "",
    });
    setErrorContrato("");
  }

  function resetFormCurso() {
    setFCurso({
      trabajador: "",
      empresa: "corevex",
      tipo: "Curso",
      fechaInicio: "",
      fechaVencimiento: "",
      diasAnticipacion: 30,
    });
    setErrorCurso("");
  }

  function openModal() {
    if (tab === "contratos") resetFormContrato();
    else resetFormCurso();
    setModalOpen(true);
  }

  async function handleGuardarContrato(e) {
    e.preventDefault();
    if (!fContrato.trabajador || !fContrato.fechaInicio || !fContrato.fechaFin) {
      setErrorContrato("Completa trabajador, fecha de inicio y fecha de fin.");
      return;
    }
    const nuevo = await contratosService.crearContrato(fContrato);
    setLista((prev) => [nuevo, ...prev]);
    setModalOpen(false);
  }

  async function handleGuardarCurso(e) {
    e.preventDefault();
    if (!fCurso.trabajador || !fCurso.fechaInicio || !fCurso.fechaVencimiento) {
      setErrorCurso("Completa trabajador, fecha de inicio y fecha de vencimiento.");
      return;
    }
    const nuevo = await rrhhService.crearCurso(fCurso);
    setLista((prev) => [nuevo, ...prev]);
    setModalOpen(false);
  }

  function handleArchivoChange(e) {
    const file = e.target.files?.[0];
    setFContrato((f) => ({ ...f, archivoNombre: file ? file.name : "" }));
  }

  const hayFiltrosActivos = !!(filtroEmpresa || filtroEstado || busqueda);

  return (
    <AppShell
      title="RRHH"
      topbarExtra={
        <button className="btn-primary" onClick={openModal} type="button">
          <IconPlus width={15} height={15} />
          {tab === "contratos" ? "Nuevo contrato" : "Nuevo registro"}
        </button>
      }
    >
      <div className="tabs">
        <button
          className={tab === "contratos" ? "active" : ""}
          onClick={() => {
            setTab("contratos");
            setFiltroEstado("");
          }}
        >
          Contratos
        </button>
        <button
          className={tab === "cursos" ? "active" : ""}
          onClick={() => {
            setTab("cursos");
            setFiltroEstado("");
          }}
        >
          Cursos / Fotocheck / EMO
        </button>
      </div>

      <div className="filters">
        <div className="search">
          <input
            placeholder="Buscar trabajador..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <select value={filtroEmpresa} onChange={(e) => setFiltroEmpresa(e.target.value)}>
          <option value="">Todas las empresas</option>
          <option value="corevex">CorevexSAC</option>
          <option value="electro">ElectroSAC</option>
        </select>
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_LABEL).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <TablaRrhh
        cargando={cargando}
        error={error}
        onReintentar={reload}
        items={listaFiltrada}
        tab={tab}
        estadoLabel={ESTADO_LABEL}
        hayFiltrosActivos={hayFiltrosActivos}
        onNuevo={openModal}
      />

      <ModalNuevoContrato
        open={modalOpen && tab === "contratos"}
        onClose={() => setModalOpen(false)}
        fContrato={fContrato}
        setFContrato={setFContrato}
        error={errorContrato}
        onArchivoChange={handleArchivoChange}
        onSubmit={handleGuardarContrato}
      />

      <ModalNuevoCurso
        open={modalOpen && tab === "cursos"}
        onClose={() => setModalOpen(false)}
        fCurso={fCurso}
        setFCurso={setFCurso}
        error={errorCurso}
        onSubmit={handleGuardarCurso}
      />
    </AppShell>
  );
}
