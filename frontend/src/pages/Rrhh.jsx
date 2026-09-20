import { AppShell } from "../components/layout/AppShell";
import { Modal } from "../components/shared/Modal";
import { IconPlus } from "../components/icons/Icons";
import { useRrhhManager, ESTADO_LABEL_RRHH as ESTADO_LABEL } from "../hooks/useRrhhManager";
import TablaRrhh from "../components/rrhh/TablaRrhh";
import ModalNuevoContrato from "../components/rrhh/ModalNuevoContrato";
import ModalNuevoCurso from "../components/rrhh/ModalNuevoCurso";
import "./Rrhh.css";

export default function Rrhh() {
  const r = useRrhhManager();

  return (
    <AppShell
      title="RRHH"
      topbarExtra={
        <button className="btn-primary" onClick={r.openModal} type="button">
          <IconPlus width={15} height={15} />
          {r.tab === "contratos" ? "Nuevo contrato" : "Nuevo registro"}
        </button>
      }
    >
      <div className="tabs" role="tablist" aria-label="Módulo de RRHH">
        <button
          id="tab-contratos"
          role="tab"
          aria-selected={r.tab === "contratos"}
          aria-controls="panel-rrhh"
          className={r.tab === "contratos" ? "active" : ""}
          onClick={() => r.cambiarTab("contratos")}
        >
          Contratos
        </button>
        <button
          id="tab-cursos"
          role="tab"
          aria-selected={r.tab === "cursos"}
          aria-controls="panel-rrhh"
          className={r.tab === "cursos" ? "active" : ""}
          onClick={() => r.cambiarTab("cursos")}
        >
          Cursos / Fotocheck / EMO
        </button>
      </div>

      <div className="filters">
        <div className="search">
          <label htmlFor="buscar-rrhh" className="sr-only">Buscar trabajador</label>
          <input
            id="buscar-rrhh"
            type="search"
            placeholder="Buscar trabajador..."
            value={r.busqueda}
            onChange={(e) => r.setBusqueda(e.target.value)}
          />
        </div>
        <select value={r.filtroEmpresa} onChange={(e) => r.setFiltroEmpresa(e.target.value)} aria-label="Filtrar por empresa">
          <option value="">Todas las empresas</option>
          <option value="corevex">CorevexSAC</option>
          <option value="electro">ElectroSAC</option>
        </select>
        <select value={r.filtroEstado} onChange={(e) => r.setFiltroEstado(e.target.value)} aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_LABEL).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div id="panel-rrhh" role="tabpanel" aria-labelledby={r.tab === "contratos" ? "tab-contratos" : "tab-cursos"}>
        <TablaRrhh
          cargando={r.cargando}
          error={r.error}
          onReintentar={r.reload}
          items={r.listaFiltrada}
          tab={r.tab}
          estadoLabel={ESTADO_LABEL}
          hayFiltrosActivos={r.hayFiltrosActivos}
          onNuevo={r.openModal}
          onVerDetalle={r.modalDetalle.abrir}
          onEditar={r.abrirEditar}
          onEliminar={r.handleEliminar}
          onAdjuntarArchivo={r.handleAdjuntarArchivo}
        />
      </div>

      <ModalNuevoContrato
        open={r.modalOpen && r.tab === "contratos"}
        onClose={r.cerrarModal}
        fContrato={r.fContrato}
        setFContrato={r.setFContrato}
        error={r.errorContrato}
        onArchivoChange={r.handleArchivoChange}
        onSubmit={r.handleGuardarContrato}
        editando={!!r.idEditando}
      />

      <ModalNuevoCurso
        open={r.modalOpen && r.tab === "cursos"}
        onClose={r.cerrarModal}
        fCurso={r.fCurso}
        setFCurso={r.setFCurso}
        error={r.errorCurso}
        onSubmit={r.handleGuardarCurso}
        trabajadoresRegistrados={r.trabajadoresRegistrados}
        editando={!!r.idEditando}
      />

      {/* ===== Modal: Ver detalle (contrato o curso) ===== */}
      <Modal
        open={r.modalDetalle.abierto}
        title={r.tab === "contratos" ? "Detalle del contrato" : "Detalle del registro"}
        subtitle={r.modalDetalle.dato?.trabajador}
        onClose={r.modalDetalle.cerrar}
      >
        {r.modalDetalle.dato && (
          <div className="detalle-grid">
            <div>
              <span className="equipo-card-label">Empresa</span>
              <p>{r.modalDetalle.dato.empresa === "corevex" ? "CorevexSAC" : "ElectroSAC"}</p>
            </div>
            <div>
              <span className="equipo-card-label">Tipo</span>
              <p>{r.modalDetalle.dato.tipo}</p>
            </div>
            <div>
              <span className="equipo-card-label">Vence</span>
              <p>{r.modalDetalle.dato.vence}</p>
            </div>
            <div>
              <span className="equipo-card-label">Estado</span>
              <p>{ESTADO_LABEL[r.modalDetalle.dato.estado]}</p>
            </div>
            {r.tab === "contratos" && (
              <div>
                <span className="equipo-card-label">Documento</span>
                <p>{r.modalDetalle.dato.archivo ? "Adjunto" : "Sin adjuntar"}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
