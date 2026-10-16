import { AppShell } from "../components/layout/AppShell";
import { IconPlus } from "../components/icons/Icons";
import { ESTADOS_EQUIPO } from "../services/equiposService";
import { TIPOS_UNIDAD } from "../services/vehiculosService";
import { useOperacionesManager } from "../hooks/useOperacionesManager";
import EquiposGrid from "../components/operaciones/EquiposGrid";
import VehiculosGrid from "../components/operaciones/VehiculosGrid";
import ModalNuevoEquipo from "../components/operaciones/ModalNuevoEquipo";
import ModalEditarEquipo from "../components/operaciones/ModalEditarEquipo";
import ModalNuevoVehiculo from "../components/operaciones/ModalNuevoVehiculo";
import ModalEditarVehiculo from "../components/operaciones/ModalEditarVehiculo";
import ModalHistorialOperaciones from "../components/operaciones/ModalHistorialOperaciones";
import ModalInspeccion from "../components/operaciones/ModalInspeccion";
import ModalBaja from "../components/operaciones/ModalBaja";
import ModalAsignarEquipo from "../components/operaciones/ModalAsignarEquipo";
import ModalMantenimiento from "../components/operaciones/ModalMantenimiento";
import ModalEditarFotosEquipo from "../components/operaciones/ModalEditarFotosEquipo";
import ModalDocumentos from "../components/operaciones/ModalDocumentos";
import "./Operaciones.css";
import "../components/operaciones/EquiposCards.css";
import "../components/operaciones/VehiculosCards.css";
import { useLocation } from "react-router-dom";

// Si se llega con otros parámetros (?tab=…&q=…) estando ya en esta
// página — por ejemplo, tocando un aviso en la campana —, se vuelve a
// montar para abrir la pestaña y el filtro del aviso.
export default function OperacionesConEnlace() {
  const { search } = useLocation();
  return <Operaciones key={search} />;
}

function Operaciones() {
  const o = useOperacionesManager();

  return (
    <AppShell
      title="Operaciones"
      topbarExtra={
        <button className="btn-primary" onClick={o.openNuevo} type="button">
          <IconPlus width={15} height={15} />
          <span className="topbar-accion-texto">{o.tab === "equipos" ? "Nuevo equipo" : "Nuevo vehículo"}</span>
        </button>
      }
    >
      <div className="tabs" role="tablist" aria-label="Equipos o vehículos">
        <button
          id="tab-equipos"
          role="tab"
          aria-selected={o.tab === "equipos"}
          aria-controls="panel-operaciones"
          className={o.tab === "equipos" ? "active" : ""}
          onClick={() => o.cambiarTab("equipos")}
        >
          Equipos
        </button>
        <button
          id="tab-vehiculos"
          role="tab"
          aria-selected={o.tab === "vehiculos"}
          aria-controls="panel-operaciones"
          className={o.tab === "vehiculos" ? "active" : ""}
          onClick={() => o.cambiarTab("vehiculos")}
        >
          Vehículos
        </button>
      </div>

      <div className="filters">
        <div className="search">
          <label htmlFor="buscar-operaciones" className="sr-only">
            {o.tab === "equipos" ? "Buscar código, serial, marca o tipo" : "Buscar placa"}
          </label>
          <input
            id="buscar-operaciones"
            type="search"
            placeholder={o.tab === "equipos" ? "Buscar código, serial o tipo..." : "Buscar placa..."}
            value={o.busqueda}
            onChange={(e) => o.setBusqueda(e.target.value)}
          />
        </div>
        <select value={o.filtroEmpresa} onChange={(e) => o.setFiltroEmpresa(e.target.value)} aria-label="Filtrar por empresa">
          <option value="">Todas las empresas</option>
          <option value="corevex">CorevexSAC</option>
          <option value="electro">ElectroSAC</option>
        </select>
        {o.tab === "equipos" && (
          <select value={o.filtroCategoria} onChange={(e) => o.setFiltroCategoria(e.target.value)} aria-label="Filtrar por tipo de equipo">
            <option value="">Todos los tipos</option>
            {o.tipos.map((t) => (
              <option key={t.nombre} value={t.nombre}>{t.nombre}</option>
            ))}
          </select>
        )}
        {o.tab === "equipos" && (
          <select value={o.filtroEstadoEquipo} onChange={(e) => o.setFiltroEstadoEquipo(e.target.value)} aria-label="Filtrar por estado">
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS_EQUIPO).map(([valor, label]) => (
              <option key={valor} value={valor}>{label}</option>
            ))}
          </select>
        )}
        {o.tab === "vehiculos" && (
          <select value={o.filtroTipoUnidad} onChange={(e) => o.setFiltroTipoUnidad(e.target.value)} aria-label="Filtrar por tipo de unidad">
            <option value="">Todos los tipos</option>
            {TIPOS_UNIDAD.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}
      </div>

      <div
        id="panel-operaciones"
        role="tabpanel"
        aria-labelledby={o.tab === "equipos" ? "tab-equipos" : "tab-vehiculos"}
      >
        {o.tab === "equipos" ? (
          <EquiposGrid
            cargando={o.cargandoEquipos}
            error={o.errorEquipos}
            onReintentar={o.recargarEquipos}
            equiposPorCategoria={o.equiposPorCategoria}
            tipos={o.tipos}
            hayFiltrosActivos={o.hayFiltrosEquipos}
            onNuevo={o.openNuevo}
            onInspeccionar={o.abrirInspeccion}
            onDevolver={o.handleDevolver}
            onVerHistorial={o.modalHistorial.abrir}
            onDarBaja={o.abrirBaja}
            onCambiarEstado={o.handleCambiarEstado}
            onEditarFotos={o.abrirEditarFotos}
            onEditar={o.abrirEditarEquipo}
            onEliminar={o.handleEliminarEquipo}
            equipoOcupado={o.equipoOcupado}
          />
        ) : (
          <VehiculosGrid
            cargando={o.cargandoVehiculos}
            error={o.errorVehiculos}
            onReintentar={o.recargarVehiculos}
            vehiculos={o.vehiculos}
            hayFiltrosActivos={o.hayFiltrosVehiculos}
            onNuevo={o.openNuevo}
            onAbrirDocumentos={o.modalDocs.abrir}
            onVerHistorial={o.modalHistorial.abrir}
            onEditar={o.abrirEditarVehiculo}
            onEliminar={o.handleEliminarVehiculo}
          />
        )}
      </div>

      <ModalNuevoEquipo
        open={o.modalNuevo.abierto && o.tab === "equipos"}
        onClose={o.modalNuevo.cerrar}
        fEquipo={o.fEquipo}
        setFEquipo={o.setFEquipo}
        onSubmit={o.handleGuardarEquipo}
        tipos={o.tipos.filter((t) => !t.antigua)}
        error={o.errorEquipo}
        guardando={o.guardando}
        textoGuardando={o.textoGuardando("Registrando…")}
      />

      <ModalNuevoVehiculo
        open={o.modalNuevo.abierto && o.tab === "vehiculos"}
        onClose={o.modalNuevo.cerrar}
        fVehiculo={o.fVehiculo}
        setFVehiculo={o.setFVehiculo}
        onSubmit={o.handleGuardarVehiculo}
        error={o.errorVehiculo}
        erroresDocumentos={o.erroresDocumentos}
        guardando={o.guardando}
        textoGuardando={o.textoGuardando("Registrando…")}
      />

      <ModalEditarEquipo
        open={o.modalEditarEquipo.abierto}
        onClose={o.modalEditarEquipo.cerrar}
        equipo={o.modalEditarEquipo.dato}
        fEquipo={o.fEquipoEditar}
        setFEquipo={o.setFEquipoEditar}
        tipos={o.tipos}
        onSubmit={o.handleGuardarEdicionEquipo}
        error={o.errorEditarEquipo}
        guardando={o.guardando}
        textoGuardando={o.textoGuardando("Guardando…")}
      />

      <ModalEditarVehiculo
        open={o.modalEditarVehiculo.abierto}
        onClose={o.modalEditarVehiculo.cerrar}
        fVehiculo={o.fVehiculoEditar}
        setFVehiculo={o.setFVehiculoEditar}
        onSubmit={o.handleGuardarEdicionVehiculo}
        error={o.errorEditarVehiculo}
        erroresDocumentos={o.erroresDocumentos}
        tipoUnidad={o.modalEditarVehiculo.dato?.tipoUnidad}
        guardando={o.guardando}
        textoGuardando={o.textoGuardando("Guardando…")}
      />

      <ModalHistorialOperaciones
        open={o.modalHistorial.abierto}
        seleccionado={o.modalHistorial.dato}
        cargando={o.cargandoHistorial}
        items={o.historialItems}
        onClose={o.modalHistorial.cerrar}
      />

      <ModalInspeccion
        open={o.modalInspeccion.abierto}
        equipo={o.modalInspeccion.dato}
        fInspeccion={o.fInspeccion}
        setFInspeccion={o.setFInspeccion}
        onClose={o.modalInspeccion.cerrar}
        onSubmit={o.handleGuardarInspeccion}
        guardando={o.guardando}
        errorServidor={o.errorAccion}
      />

      <ModalBaja
        open={o.modalBaja.abierto}
        equipo={o.modalBaja.dato}
        motivo={o.motivoBaja}
        setMotivo={o.setMotivoBaja}
        error={o.errorMotivo}
        onClose={o.modalBaja.cerrar}
        onConfirmar={o.handleConfirmarBaja}
        guardando={o.guardando}
        errorServidor={o.errorAccion}
      />

      <ModalAsignarEquipo
        open={o.modalAsignar.abierto}
        equipo={o.modalAsignar.dato}
        vehiculos={o.vehiculosParaAsignar}
        vehiculoId={o.vehiculoIdAsignar}
        setVehiculoId={o.setVehiculoIdAsignar}
        error={o.errorAsignar}
        onClose={o.modalAsignar.cerrar}
        onConfirmar={o.handleConfirmarAsignar}
        guardando={o.guardando}
        errorServidor={o.errorAccion}
      />

      <ModalMantenimiento
        open={o.modalMantenimiento.abierto}
        equipo={o.modalMantenimiento.dato}
        comentario={o.comentarioMantenimiento}
        setComentario={o.setComentarioMantenimiento}
        error={o.errorMantenimiento}
        onClose={o.modalMantenimiento.cerrar}
        onConfirmar={o.handleConfirmarMantenimiento}
        guardando={o.guardando}
        errorServidor={o.errorAccion}
      />

      <ModalEditarFotosEquipo
        open={o.modalFotos.abierto}
        equipo={o.modalFotos.dato}
        fotos={o.fotosEditando}
        setFotos={o.setFotosEditando}
        onClose={o.modalFotos.cerrar}
        onGuardar={o.handleGuardarFotos}
        guardando={o.guardando}
        errorServidor={o.errorAccion}
      />

      <ModalDocumentos
        open={o.modalDocs.abierto}
        vehiculo={o.modalDocs.dato}
        onClose={o.modalDocs.cerrar}
        onSubirArchivo={o.handleSubirDocumento}
        estadoDocumento={o.estadoDocumento}
        onEditarDocumentos={(v) => {
          o.modalDocs.cerrar();
          o.abrirEditarVehiculo(v);
        }}
      />
    </AppShell>
  );
}
