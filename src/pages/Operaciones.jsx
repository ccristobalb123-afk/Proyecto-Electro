import { useEffect, useState } from "react";
import { AppShell } from "../components/layout/AppShell";
import { IconPlus } from "../components/icons/Icons";
import * as equiposService from "../services/equiposService";
import * as vehiculosService from "../services/vehiculosService";
import { CATEGORIAS } from "../services/equiposService";
import { TIPOS_UNIDAD } from "../services/vehiculosService";
import { useDebounce } from "../hooks/useDebounce";
import { useAsyncList } from "../hooks/useAsyncList";
import EquiposGrid from "../components/operaciones/EquiposGrid";
import VehiculosGrid from "../components/operaciones/VehiculosGrid";
import ModalNuevoEquipo from "../components/operaciones/ModalNuevoEquipo";
import ModalNuevoVehiculo from "../components/operaciones/ModalNuevoVehiculo";
import ModalHistorialOperaciones from "../components/operaciones/ModalHistorialOperaciones";
import ModalInspeccion from "../components/operaciones/ModalInspeccion";
import ModalBaja from "../components/operaciones/ModalBaja";
import ModalDocumentos from "../components/operaciones/ModalDocumentos";
import "./Operaciones.css";

function iniciales(nombre) {
  return nombre.split(" ").map((p) => p[0]).slice(0, 2).join("");
}

export default function Operaciones() {
  const [tab, setTab] = useState("equipos"); // "equipos" | "vehiculos"
  const [historialItems, setHistorialItems] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const busquedaDebounced = useDebounce(busqueda, 400);

  // ---- Modales ----
  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalHistorial, setModalHistorial] = useState(null); // equipo|vehiculo seleccionado
  const [modalInspeccion, setModalInspeccion] = useState(null); // equipo seleccionado
  const [modalBaja, setModalBaja] = useState(null); // equipo seleccionado
  const [modalDocs, setModalDocs] = useState(null); // vehiculo seleccionado

  // ---- Formulario Nuevo equipo ----
  const [fEquipo, setFEquipo] = useState({
    codigo: "",
    categoria: "Escaleras Embonables",
    empresa: "corevex",
    camposValores: {},
  });
  const [errorCodigo, setErrorCodigo] = useState(false);

  // ---- Formulario Nuevo vehículo ----
  const [fVehiculo, setFVehiculo] = useState({
    placa: "",
    tipoUnidad: "Camioneta",
    empresa: "corevex",
    cuadrilla: "",
  });

  // ---- Formulario inspección ----
  const [fInspeccion, setFInspeccion] = useState({
    tipo: "interna",
    fechaInspeccion: "",
    fechaVencimiento: "",
    diasAnticipacion: 30,
    resultado: "aprobado",
  });

  // ---- Formulario dar de baja ----
  const [motivoBaja, setMotivoBaja] = useState("");
  const [errorMotivo, setErrorMotivo] = useState(false);

  // Carga de equipos: se re-consulta al backend cuando cambia un filtro,
  // en vez de traer todo y filtrar en el cliente (importante apenas haya
  // cientos/miles de registros reales — punto 1.16/1.17 del roadmap).
  const {
    data: equipos,
    setData: setEquipos,
    loading: cargandoEquipos,
    error: errorEquipos,
    reload: recargarEquipos,
  } = useAsyncList(
    () => equiposService.listarEquipos({ empresa: filtroEmpresa, categoria: filtroCategoria, q: busquedaDebounced }),
    [filtroEmpresa, filtroCategoria, busquedaDebounced]
  );

  const {
    data: vehiculos,
    setData: setVehiculos,
    loading: cargandoVehiculos,
    error: errorVehiculos,
    reload: recargarVehiculos,
  } = useAsyncList(
    () => vehiculosService.listarVehiculos({ empresa: filtroEmpresa, q: busquedaDebounced }),
    [filtroEmpresa, busquedaDebounced]
  );

  const codigosExistentes = equipos.map((e) => e.codigo);

  // Trae la hoja de vida (equipo o vehículo) recién cuando se abre el
  // modal, no de antemano para todos los registros.
  useEffect(() => {
    if (!modalHistorial) return;
    setCargandoHistorial(true);
    const obtener = modalHistorial.codigo
      ? equiposService.obtenerHojaDeVida(modalHistorial.codigo)
      : vehiculosService.obtenerHistorial(modalHistorial.placa);
    obtener
      .then(setHistorialItems)
      .catch(() => setHistorialItems([]))
      .finally(() => setCargandoHistorial(false));
  }, [modalHistorial]);

  function checkCodigo(valor) {
    setFEquipo((f) => ({ ...f, codigo: valor }));
    setErrorCodigo(codigosExistentes.includes(valor.trim()));
  }

  function openNuevo() {
    if (tab === "equipos") {
      setFEquipo({ codigo: "", categoria: "Escaleras Embonables", empresa: "corevex", camposValores: {} });
      setErrorCodigo(false);
    } else {
      setFVehiculo({ placa: "", tipoUnidad: "Camioneta", empresa: "corevex", cuadrilla: "" });
    }
    setModalNuevo(true);
  }

  async function handleGuardarEquipo(e) {
    e.preventDefault();
    if (!fEquipo.codigo.trim() || errorCodigo) return;
    // El backend valida de nuevo el código único (nunca confiar solo en
    // la validación del frontend) y crea el equipo con estado DISPONIBLE.
    const nuevo = await equiposService.crearEquipo(fEquipo);
    setEquipos((prev) => [nuevo, ...prev]);
    setModalNuevo(false);
  }

  async function handleGuardarVehiculo(e) {
    e.preventDefault();
    if (!fVehiculo.placa.trim()) return;
    const nuevo = await vehiculosService.crearVehiculo(fVehiculo);
    setVehiculos((prev) => [nuevo, ...prev]);
    setModalNuevo(false);
  }

  async function handleGuardarInspeccion(e) {
    e.preventDefault();
    await equiposService.registrarInspeccion(modalInspeccion.id, fInspeccion);
    // Si resultado=APROBADO → equipo.estado=DISPONIBLE, actualiza
    // proximaInspeccion. Si OBSERVADO/RECHAZADO → equipo.estado=MANTENIMIENTO.
    const nuevoEstado = fInspeccion.resultado === "aprobado" ? "disponible" : "mantenimiento";
    const actualizado = await equiposService.cambiarEstadoEquipo(modalInspeccion.id, nuevoEstado);
    setEquipos((prev) => prev.map((eq) => (eq.id === actualizado.id ? actualizado : eq)));
    setModalInspeccion(null);
  }

  async function handleConfirmarBaja() {
    if (!motivoBaja.trim()) {
      setErrorMotivo(true);
      return;
    }
    const actualizado = await equiposService.darDeBajaEquipo(modalBaja.id, motivoBaja);
    setEquipos((prev) => prev.map((eq) => (eq.id === actualizado.id ? actualizado : eq)));
    setModalBaja(null);
    setMotivoBaja("");
  }

  async function handleDevolver(eq) {
    const actualizado = await equiposService.devolverEquipo(eq.id);
    setEquipos((prev) => prev.map((e) => (e.id === actualizado.id ? actualizado : e)));
  }

  async function handleCambiarEstado(eq, nuevoEstado) {
    if (nuevoEstado === "debaja") {
      setMotivoBaja("");
      setErrorMotivo(false);
      setModalBaja(eq);
      return;
    }
    const actualizado = await equiposService.cambiarEstadoEquipo(eq.id, nuevoEstado);
    setEquipos((prev) => prev.map((e) => (e.id === actualizado.id ? actualizado : e)));
  }

  function abrirInspeccion(eq) {
    setFInspeccion({ tipo: "interna", fechaInspeccion: "", fechaVencimiento: "", diasAnticipacion: 30, resultado: "aprobado" });
    setModalInspeccion(eq);
  }

  function abrirBaja(eq) {
    setMotivoBaja("");
    setErrorMotivo(false);
    setModalBaja(eq);
  }

  async function handleSubirDocumento(indice, archivo) {
    // TODO backend: POST /api/vehiculos/:id/documentos (multipart/form-data)
    // — sube el archivo real y el backend devuelve su URL definitiva.
    const archivoUrl = URL.createObjectURL(archivo);
    setVehiculos((prev) =>
      prev.map((v) => {
        if (v.id !== modalDocs.id) return v;
        const documentos = v.documentos.map((doc, idx) =>
          idx === indice ? { ...doc, archivo: true, archivoUrl, archivoNombre: archivo.name } : doc
        );
        return { ...v, documentos };
      })
    );
    setModalDocs((prev) => {
      const documentos = prev.documentos.map((doc, idx) =>
        idx === indice ? { ...doc, archivo: true, archivoUrl, archivoNombre: archivo.name } : doc
      );
      return { ...prev, documentos };
    });
  }

  const hayFiltrosEquipos = !!(filtroEmpresa || filtroCategoria || busqueda);
  const hayFiltrosVehiculos = !!(filtroEmpresa || busqueda);

  // El filtro por texto libre ya se aplicó en el service; acá solo
  // referenciamos las listas tal como llegaron.
  const equiposFiltrados = equipos;
  const vehiculosFiltrados = vehiculos;

  // Agrupa los equipos por categoría (Escaleras, Guantes, Líneas de vida...)
  // en vez de mostrarlos todos mezclados en un solo grid. Usa el orden de
  // CATEGORIAS para que las secciones salgan siempre en el mismo orden.
  const equiposPorCategoria = Object.keys(CATEGORIAS)
    .map((categoria) => ({
      categoria,
      items: equiposFiltrados.filter((eq) => eq.categoria === categoria),
    }))
    .filter((grupo) => grupo.items.length > 0);

  return (
    <AppShell
      title="Operaciones"
      topbarExtra={
        <button className="btn-primary" onClick={openNuevo} type="button">
          <IconPlus width={15} height={15} />
          {tab === "equipos" ? "Nuevo equipo" : "Nuevo vehículo"}
        </button>
      }
    >
      <div className="tabs">
        <button className={tab === "equipos" ? "active" : ""} onClick={() => { setTab("equipos"); setFiltroCategoria(""); }}>
          Equipos
        </button>
        <button className={tab === "vehiculos" ? "active" : ""} onClick={() => setTab("vehiculos")}>
          Vehículos
        </button>
      </div>

      <div className="filters">
        <div className="search">
          <input placeholder={tab === "equipos" ? "Buscar código o categoría..." : "Buscar placa..."} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <select value={filtroEmpresa} onChange={(e) => setFiltroEmpresa(e.target.value)}>
          <option value="">Todas las empresas</option>
          <option value="corevex">CorevexSAC</option>
          <option value="electro">ElectroSAC</option>
        </select>
        {tab === "equipos" && (
          <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
            <option value="">Todas las categorías</option>
            {Object.keys(CATEGORIAS).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
        {tab === "vehiculos" && (
          <select>
            <option value="">Todos los tipos</option>
            {TIPOS_UNIDAD.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}
      </div>

      {tab === "equipos" ? (
        <EquiposGrid
          cargando={cargandoEquipos}
          error={errorEquipos}
          onReintentar={recargarEquipos}
          equiposPorCategoria={equiposPorCategoria}
          hayFiltrosActivos={hayFiltrosEquipos}
          onNuevo={openNuevo}
          onInspeccionar={abrirInspeccion}
          onDevolver={handleDevolver}
          onVerHistorial={setModalHistorial}
          onDarBaja={abrirBaja}
          onCambiarEstado={handleCambiarEstado}
        />
      ) : (
        <VehiculosGrid
          cargando={cargandoVehiculos}
          error={errorVehiculos}
          onReintentar={recargarVehiculos}
          vehiculos={vehiculosFiltrados}
          hayFiltrosActivos={hayFiltrosVehiculos}
          onNuevo={openNuevo}
          onAbrirDocumentos={setModalDocs}
          onVerHistorial={setModalHistorial}
        />
      )}

      <ModalNuevoEquipo
        open={modalNuevo && tab === "equipos"}
        onClose={() => setModalNuevo(false)}
        fEquipo={fEquipo}
        setFEquipo={setFEquipo}
        errorCodigo={errorCodigo}
        checkCodigo={checkCodigo}
        onSubmit={handleGuardarEquipo}
      />

      <ModalNuevoVehiculo
        open={modalNuevo && tab === "vehiculos"}
        onClose={() => setModalNuevo(false)}
        fVehiculo={fVehiculo}
        setFVehiculo={setFVehiculo}
        onSubmit={handleGuardarVehiculo}
      />

      <ModalHistorialOperaciones
        open={!!modalHistorial}
        seleccionado={modalHistorial}
        cargando={cargandoHistorial}
        items={historialItems}
        onClose={() => setModalHistorial(null)}
      />

      <ModalInspeccion
        open={!!modalInspeccion}
        equipo={modalInspeccion}
        fInspeccion={fInspeccion}
        setFInspeccion={setFInspeccion}
        onClose={() => setModalInspeccion(null)}
        onSubmit={handleGuardarInspeccion}
      />

      <ModalBaja
        open={!!modalBaja}
        equipo={modalBaja}
        motivo={motivoBaja}
        setMotivo={(v) => { setMotivoBaja(v); setErrorMotivo(false); }}
        error={errorMotivo}
        onClose={() => setModalBaja(null)}
        onConfirmar={handleConfirmarBaja}
      />

      <ModalDocumentos
        open={!!modalDocs}
        vehiculo={modalDocs}
        onClose={() => setModalDocs(null)}
        onSubirArchivo={handleSubirDocumento}
      />
    </AppShell>
  );
}
