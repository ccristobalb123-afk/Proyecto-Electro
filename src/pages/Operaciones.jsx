import { useState } from "react";
import { AppShell } from "../components/layout/AppShell";
import { Modal, ModalActions, CompanyChoice, Timeline } from "../components/shared/Modal";
import {
  IconPlus,
  IconEye,
  IconClipboardCheck,
  IconTrash,
  IconAlertCircle,
  IconExternalLink,
  IconFile,
  IconUpload,
} from "../components/icons/Icons";
import "./Operaciones.css";

// TODO backend: GET /api/categorias-equipo (tabla CategoriaEquipo) —
// camposPersonalizados define qué campos pide cada categoría.
const CATEGORIAS = {
  Escalera: [
    { nombre: "Serie", placeholder: "Ej. SC-2201" },
    { nombre: "Marca", placeholder: "Ej. Escalerín Pro" },
    { nombre: "Pasos", placeholder: "Ej. 12" },
  ],
  "Arnés": [
    { nombre: "Serie", placeholder: "Ej. AR-0091" },
    { nombre: "Marca", placeholder: "Ej. 3M Protecta" },
    { nombre: "Talla", placeholder: "Ej. M/L" },
  ],
  Estrobo: [
    { nombre: "Serie", placeholder: "Ej. ES-3310" },
    { nombre: "Longitud (m)", placeholder: "Ej. 1.8" },
    { nombre: "Capacidad (kg)", placeholder: "Ej. 100" },
  ],
  "Casco dieléctrico": [
    { nombre: "Serie", placeholder: "Ej. CD-118" },
    { nombre: "Marca", placeholder: "Ej. 3M" },
  ],
};

// TODO backend: GET /api/equipos?empresa=&categoria=&estado=&q=
const EQUIPOS_INICIALES = [
  { id: 1, codigo: "EQ-014", categoria: "Arnés", empresa: "corevex", responsable: "J. Ramírez", estado: "asignado" },
  { id: 2, codigo: "EQ-021", categoria: "Escalera", empresa: "electro", responsable: null, estado: "vencido" },
  { id: 3, codigo: "EQ-072", categoria: "Estrobo", empresa: "corevex", responsable: "Milagros R.", estado: "mantenimiento" },
  { id: 4, codigo: "EQ-039", categoria: "Casco dieléctrico", empresa: "electro", responsable: null, estado: "debaja" },
  { id: 5, codigo: "EQ-058", categoria: "Casco dieléctrico", empresa: "corevex", responsable: "Alonso T.", estado: "asignado" },
];

// TODO backend: GET /api/vehiculos?empresa=&tipoUnidad=&q=
const TIPOS_UNIDAD = ["Camioneta", "Camión", "Minivan", "Grúa", "Auto"];
const DOCS_BASE = ["SOAT", "Revisión técnica", "Tarjeta de circulación", "Seguro", "Permiso de operación"];

const VEHICULOS_INICIALES = [
  {
    id: 1,
    placa: "ABC-123",
    tipoUnidad: "Camión",
    empresaDueña: "corevex",
    empresaUso: "corevex",
    cuadrilla: "Cuadrilla Yerson H.",
    documentos: [
      { tipo: "SOAT", dias: 22, estado: "amber", archivo: true },
      { tipo: "Revisión técnica", dias: 95, estado: "gray", archivo: true },
      { tipo: "Tarjeta de circulación", dias: 210, estado: "gray", archivo: true },
      { tipo: "Seguro", dias: 5, estado: "red", archivo: false },
      { tipo: "Permiso de operación", dias: 150, estado: "gray", archivo: true },
    ],
  },
  {
    id: 2,
    placa: "DEF-456",
    tipoUnidad: "Grúa",
    empresaDueña: "electro",
    empresaUso: "corevex",
    cuadrilla: "Proyecto Tecsur — LDS",
    documentos: [
      ...DOCS_BASE.map((tipo) => ({ tipo, dias: 60, estado: "gray", archivo: true })),
      { tipo: "Brazo hidráulico", dias: 40, estado: "amber", archivo: true },
    ],
  },
];

const HISTORIAL_EQUIPO = {
  "EQ-014": [
    { titulo: "Asignado a J. Ramírez Soto", fecha: "12 ago 2026", tone: "success" },
    { titulo: "Inspección interna — Aprobado", fecha: "02 ago 2026", tone: "volt" },
    { titulo: "Registrado en el sistema", fecha: "15 ene 2026" },
  ],
  "EQ-021": [
    { titulo: "Devuelto — sin responsable actual", fecha: "19 ago 2026" },
    { titulo: "Registrado en el sistema", fecha: "20 feb 2026" },
  ],
  "EQ-072": [
    { titulo: "Enviado a mantenimiento", fecha: "21 ago 2026", tone: "volt" },
    { titulo: "Asignado a Milagros Ríos", fecha: "10 jun 2026", tone: "success" },
  ],
  "EQ-039": [
    { titulo: "Dado de baja — desgaste", fecha: "15 ago 2026" },
    { titulo: "Registrado en el sistema", fecha: "10 ene 2026" },
  ],
  "EQ-058": [
    { titulo: "Asignado a Alonso Torres", fecha: "18 ago 2026", tone: "success" },
    { titulo: "Registrado en el sistema", fecha: "22 abr 2026" },
  ],
};

function iniciales(nombre) {
  return nombre.split(" ").map((p) => p[0]).slice(0, 2).join("");
}

export default function Operaciones() {
  const [tab, setTab] = useState("equipos"); // "equipos" | "vehiculos"
  const [equipos, setEquipos] = useState(EQUIPOS_INICIALES);
  const [vehiculos, setVehiculos] = useState(VEHICULOS_INICIALES);

  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [busqueda, setBusqueda] = useState("");

  // ---- Modales ----
  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalHistorial, setModalHistorial] = useState(null); // equipo|vehiculo seleccionado
  const [modalInspeccion, setModalInspeccion] = useState(null); // equipo seleccionado
  const [modalBaja, setModalBaja] = useState(null); // equipo seleccionado
  const [modalDocs, setModalDocs] = useState(null); // vehiculo seleccionado

  // ---- Formulario Nuevo equipo ----
  const [fEquipo, setFEquipo] = useState({
    codigo: "",
    categoria: "Escalera",
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

  const codigosExistentes = equipos.map((e) => e.codigo);

  function checkCodigo(valor) {
    setFEquipo((f) => ({ ...f, codigo: valor }));
    setErrorCodigo(codigosExistentes.includes(valor.trim()));
  }

  function openNuevo() {
    if (tab === "equipos") {
      setFEquipo({ codigo: "", categoria: "Escalera", empresa: "corevex", camposValores: {} });
      setErrorCodigo(false);
    } else {
      setFVehiculo({ placa: "", tipoUnidad: "Camioneta", empresa: "corevex", cuadrilla: "" });
    }
    setModalNuevo(true);
  }

  function handleGuardarEquipo(e) {
    e.preventDefault();
    if (!fEquipo.codigo.trim() || errorCodigo) return;
    // TODO backend: POST /api/equipos { ...fEquipo } — el backend valida
    // de nuevo el código único (nunca confiar solo en la validación del
    // frontend) y crea el equipo con estado inicial DISPONIBLE.
    const nuevo = {
      id: Date.now(),
      codigo: fEquipo.codigo.trim(),
      categoria: fEquipo.categoria,
      empresa: fEquipo.empresa,
      responsable: null,
      estado: "disponible",
    };
    setEquipos((prev) => [nuevo, ...prev]);
    setModalNuevo(false);
  }

  function handleGuardarVehiculo(e) {
    e.preventDefault();
    if (!fVehiculo.placa.trim()) return;
    // TODO backend: POST /api/vehiculos { ...fVehiculo }
    const nuevo = {
      id: Date.now(),
      placa: fVehiculo.placa.trim(),
      tipoUnidad: fVehiculo.tipoUnidad,
      empresaDueña: fVehiculo.empresa,
      empresaUso: fVehiculo.empresa,
      cuadrilla: fVehiculo.cuadrilla,
      documentos: DOCS_BASE.map((tipo) => ({ tipo, dias: null, estado: "gray", archivo: false })).concat(
        fVehiculo.tipoUnidad === "Grúa" ? [{ tipo: "Brazo hidráulico", dias: null, estado: "gray", archivo: false }] : []
      ),
    };
    setVehiculos((prev) => [nuevo, ...prev]);
    setModalNuevo(false);
  }

  function handleGuardarInspeccion(e) {
    e.preventDefault();
    // TODO backend: POST /api/equipos/:id/inspecciones { ...fInspeccion }
    // Si resultado=APROBADO → equipo.estado=DISPONIBLE, actualiza
    // proximaInspeccion. Si OBSERVADO/RECHAZADO → equipo.estado=MANTENIMIENTO.
    const nuevoEstado = fInspeccion.resultado === "aprobado" ? "disponible" : "mantenimiento";
    setEquipos((prev) =>
      prev.map((eq) => (eq.codigo === modalInspeccion.codigo ? { ...eq, estado: nuevoEstado } : eq))
    );
    setModalInspeccion(null);
  }

  function handleConfirmarBaja() {
    if (!motivoBaja.trim()) {
      setErrorMotivo(true);
      return;
    }
    // TODO backend: PATCH /api/equipos/:id/dar-de-baja { motivo: motivoBaja }
    setEquipos((prev) =>
      prev.map((eq) => (eq.codigo === modalBaja.codigo ? { ...eq, estado: "debaja" } : eq))
    );
    setModalBaja(null);
    setMotivoBaja("");
  }

  const equiposFiltrados = equipos.filter((eq) => {
    if (filtroEmpresa && eq.empresa !== filtroEmpresa) return false;
    if (filtroCategoria && eq.categoria !== filtroCategoria) return false;
    if (busqueda && !eq.codigo.toLowerCase().includes(busqueda.toLowerCase()) && !eq.categoria.toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  });

  const vehiculosFiltrados = vehiculos.filter((v) => {
    if (filtroEmpresa && v.empresaDueña !== filtroEmpresa) return false;
    if (busqueda && !v.placa.toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  });

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
        <table>
          <thead>
            <tr>
              <th>Código</th><th>Categoría</th><th>Empresa dueña</th><th>Responsable</th><th>Estado</th><th></th>
            </tr>
          </thead>
          <tbody>
            {equiposFiltrados.map((eq) => (
              <tr key={eq.id}>
                <td className="code">{eq.codigo}</td>
                <td>{eq.categoria}</td>
                <td><span className={`co-badge ${eq.empresa}`}>{eq.empresa === "corevex" ? "Corevex" : "Electro"}</span></td>
                <td>
                  {eq.responsable ? (
                    <div className="responsable"><div className="mini-avatar">{iniciales(eq.responsable)}</div>{eq.responsable}</div>
                  ) : (
                    <span className="sin-responsable">Sin asignar</span>
                  )}
                </td>
                <td>
                  <span className={`estado ${eq.estado}`}>
                    <i />
                    {{ disponible: "Disponible", asignado: "Asignado", mantenimiento: "Mantenimiento", vencido: "Vencido", debaja: "De baja" }[eq.estado]}
                  </span>
                </td>
                <td>
                  <div className="row-actions">
                    <button className="icon-btn" type="button" title="Ver hoja de vida" onClick={() => setModalHistorial(eq)}>
                      <IconEye />
                    </button>
                    <button className="icon-btn" type="button" title="Registrar inspección" onClick={() => {
                      setFInspeccion({ tipo: "interna", fechaInspeccion: "", fechaVencimiento: "", diasAnticipacion: 30, resultado: "aprobado" });
                      setModalInspeccion(eq);
                    }}>
                      <IconClipboardCheck />
                    </button>
                    <button className="icon-btn" type="button" title="Dar de baja" onClick={() => { setMotivoBaja(""); setErrorMotivo(false); setModalBaja(eq); }}>
                      <IconTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Placa</th><th>Tipo</th><th>Empresa dueña</th><th>Empresa que usa</th><th>Cuadrilla / Proyecto</th><th>Documentos</th><th></th>
            </tr>
          </thead>
          <tbody>
            {vehiculosFiltrados.map((v) => {
              const porVencer = v.documentos.filter((d) => d.estado !== "gray").length;
              return (
                <tr key={v.id}>
                  <td className="code">{v.placa}</td>
                  <td>{v.tipoUnidad}</td>
                  <td><span className={`co-badge ${v.empresaDueña}`}>{v.empresaDueña === "corevex" ? "Corevex" : "Electro"}</span></td>
                  <td><span className={`co-badge ${v.empresaUso}`}>{v.empresaUso === "corevex" ? "Corevex" : "Electro"}</span></td>
                  <td>{v.cuadrilla}</td>
                  <td>
                    <button className="doc-chip" type="button" onClick={() => setModalDocs(v)}>
                      <IconFile width={13} height={13} />
                      {v.documentos.length} docs{porVencer > 0 ? ` · ${porVencer} por vencer` : " · al día"}
                    </button>
                  </td>
                  <td>
                    <button className="icon-btn" type="button" title="Ver historial" onClick={() => setModalHistorial(v)}>
                      <IconEye />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* ===== Modal: Nuevo equipo ===== */}
      <Modal open={modalNuevo && tab === "equipos"} title="Nuevo equipo" subtitle="Completa los datos del equipo o EPP." onClose={() => setModalNuevo(false)}>
        <form onSubmit={handleGuardarEquipo}>
          <div className="form-row">
            <div className="form-field">
              <label>Código</label>
              <input value={fEquipo.codigo} onChange={(e) => checkCodigo(e.target.value)} placeholder="EQ-081" />
              {errorCodigo && <p className="field-error">Ese código ya existe. Usa otro.</p>}
            </div>
            <div className="form-field">
              <label>Categoría</label>
              <select value={fEquipo.categoria} onChange={(e) => setFEquipo({ ...fEquipo, categoria: e.target.value, camposValores: {} })}>
                {Object.keys(CATEGORIAS).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            {CATEGORIAS[fEquipo.categoria].map((campo) => (
              <div className="form-field" key={campo.nombre}>
                <label>{campo.nombre}</label>
                <input
                  placeholder={campo.placeholder}
                  value={fEquipo.camposValores[campo.nombre] || ""}
                  onChange={(e) =>
                    setFEquipo({
                      ...fEquipo,
                      camposValores: { ...fEquipo.camposValores, [campo.nombre]: e.target.value },
                    })
                  }
                />
              </div>
            ))}
          </div>

          <div className="form-field">
            <label>Empresa dueña</label>
            <CompanyChoice name="empresaEquipo" value={fEquipo.empresa} onChange={(v) => setFEquipo({ ...fEquipo, empresa: v })} />
          </div>

          <div className="checklist-note">
            <IconClipboardCheck width={15} height={15} />
            El checklist pre-uso se toma automáticamente de la plantilla de la categoría elegida.
          </div>

          <ModalActions onCancel={() => setModalNuevo(false)}>
            <button className="btn-primary" type="submit">Guardar equipo — queda Disponible</button>
          </ModalActions>
        </form>
      </Modal>

      {/* ===== Modal: Nuevo vehículo ===== */}
      <Modal open={modalNuevo && tab === "vehiculos"} title="Nuevo vehículo" subtitle="Completa los datos del vehículo." onClose={() => setModalNuevo(false)}>
        <form onSubmit={handleGuardarVehiculo}>
          <div className="form-row">
            <div className="form-field">
              <label>Placa</label>
              <input value={fVehiculo.placa} onChange={(e) => setFVehiculo({ ...fVehiculo, placa: e.target.value })} placeholder="Ej. A7P-925" />
            </div>
            <div className="form-field">
              <label>Tipo de unidad</label>
              <select value={fVehiculo.tipoUnidad} onChange={(e) => setFVehiculo({ ...fVehiculo, tipoUnidad: e.target.value })}>
                {TIPOS_UNIDAD.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {fVehiculo.tipoUnidad === "Grúa" && (
            <div className="consecuencia aprobado" style={{ background: "var(--volt-tint)" }}>
              <div className="consecuencia-title" style={{ color: "var(--volt-dark)" }}>
                <IconAlertCircle width={14} height={14} />
                Documento adicional requerido
              </div>
              <p className="consecuencia-hint" style={{ color: "var(--volt-dark)" }}>
                Las grúas también necesitan el certificado de Brazo hidráulico, además de los 5 documentos base.
              </p>
            </div>
          )}

          <div className="form-field">
            <label>Empresa dueña</label>
            <CompanyChoice name="empresaVehiculo" value={fVehiculo.empresa} onChange={(v) => setFVehiculo({ ...fVehiculo, empresa: v })} />
          </div>

          <div className="form-field">
            <label>Cuadrilla / Proyecto</label>
            <input value={fVehiculo.cuadrilla} onChange={(e) => setFVehiculo({ ...fVehiculo, cuadrilla: e.target.value })} placeholder="Ej. Cuadrilla Yerson H." />
          </div>

          <ModalActions onCancel={() => setModalNuevo(false)}>
            <button className="btn-primary" type="submit">Guardar vehículo</button>
          </ModalActions>
        </form>
      </Modal>

      {/* ===== Modal: Hoja de vida / Historial ===== */}
      <Modal
        open={!!modalHistorial}
        title={modalHistorial ? `Hoja de vida — ${modalHistorial.codigo || modalHistorial.placa}` : ""}
        subtitle={modalHistorial ? (modalHistorial.categoria || modalHistorial.tipoUnidad) : ""}
        onClose={() => setModalHistorial(null)}
      >
        <Timeline items={modalHistorial ? HISTORIAL_EQUIPO[modalHistorial.codigo] || [] : []} />
      </Modal>

      {/* ===== Modal: Registrar inspección ===== */}
      <Modal
        open={!!modalInspeccion}
        title="Registrar inspección"
        subtitle={modalInspeccion ? `${modalInspeccion.codigo} — ${modalInspeccion.categoria}` : ""}
        onClose={() => setModalInspeccion(null)}
      >
        <form onSubmit={handleGuardarInspeccion}>
          <div className="form-field">
            <label>Tipo de inspección</label>
            <select value={fInspeccion.tipo} onChange={(e) => setFInspeccion({ ...fInspeccion, tipo: e.target.value })}>
              <option value="interna">Interna — con foto</option>
              <option value="externa">Externa — con certificado</option>
            </select>
          </div>

          <div className="form-field">
            <label>{fInspeccion.tipo === "interna" ? "Foto de la inspección" : "Certificado (PDF)"}</label>
            <label className="dropzone">
              <IconUpload width={22} height={22} />
              <p><b>Haz clic para subir</b> — {fInspeccion.tipo === "interna" ? "foto (JPG/PNG)" : "certificado (PDF)"}</p>
              <input type="file" hidden />
            </label>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Fecha de inspección</label>
              <input type="date" value={fInspeccion.fechaInspeccion} onChange={(e) => setFInspeccion({ ...fInspeccion, fechaInspeccion: e.target.value })} />
            </div>
            <div className="form-field">
              <label>Fecha de vencimiento</label>
              <input type="date" value={fInspeccion.fechaVencimiento} onChange={(e) => setFInspeccion({ ...fInspeccion, fechaVencimiento: e.target.value })} />
            </div>
          </div>

          <div className="aviso-field">
            <label>Aviso de vencimiento</label>
            <div className="aviso-input-row">
              <input type="number" min={1} value={fInspeccion.diasAnticipacion} onChange={(e) => setFInspeccion({ ...fInspeccion, diasAnticipacion: Number(e.target.value) })} />
              <span>días antes del vencimiento</span>
            </div>
          </div>

          <div className="form-field">
            <label>Resultado</label>
            <select value={fInspeccion.resultado} onChange={(e) => setFInspeccion({ ...fInspeccion, resultado: e.target.value })}>
              <option value="aprobado">Aprobado</option>
              <option value="observado">Observado</option>
              <option value="rechazado">Rechazado</option>
            </select>
          </div>

          {fInspeccion.resultado === "aprobado" ? (
            <div className="consecuencia aprobado">
              <div className="consecuencia-title"><IconEye width={14} height={14} />El equipo queda Disponible</div>
              <p className="consecuencia-hint">Se actualiza la próxima inspección con esta fecha de vencimiento.</p>
            </div>
          ) : (
            <div className="consecuencia rechazado">
              <div className="consecuencia-title"><IconAlertCircle width={14} height={14} />El equipo pasa a Mantenimiento</div>
              <p className="consecuencia-hint">No podrá asignarse hasta una nueva inspección con resultado Aprobado.</p>
            </div>
          )}

          <ModalActions onCancel={() => setModalInspeccion(null)}>
            <button className="btn-primary" type="submit">Guardar inspección</button>
          </ModalActions>
        </form>
      </Modal>

      {/* ===== Modal: Dar de baja ===== */}
      <Modal open={!!modalBaja} title="Dar de baja" subtitle={modalBaja ? `${modalBaja.codigo} — ${modalBaja.categoria}` : ""} onClose={() => setModalBaja(null)}>
        <div className="danger-box">
          <div className="danger-title"><IconAlertCircle width={14} height={14} />Esta acción no se puede deshacer</div>
          <p className="danger-hint">El equipo pasará a De baja y no podrá volver a asignarse ni aparecer como disponible.</p>
        </div>
        <div className="form-field">
          <label>Motivo de la baja</label>
          <textarea
            rows={4}
            placeholder="Ej. Desgaste irreversible tras inspección, no cumple estándar de seguridad..."
            value={motivoBaja}
            onChange={(e) => { setMotivoBaja(e.target.value); setErrorMotivo(false); }}
          />
          {errorMotivo && <p className="field-error">Escribe un motivo antes de continuar.</p>}
        </div>
        <ModalActions onCancel={() => setModalBaja(null)}>
          <button className="btn-danger" type="button" onClick={handleConfirmarBaja}>Confirmar baja</button>
        </ModalActions>
      </Modal>

      {/* ===== Modal: Documentos del vehículo ===== */}
      <Modal open={!!modalDocs} title="Documentos" subtitle={modalDocs ? `${modalDocs.placa} — ${modalDocs.tipoUnidad}` : ""} onClose={() => setModalDocs(null)} wide>
        {modalDocs && modalDocs.documentos.map((d, i) => (
          <div className="docs-list-item" key={i}>
            <div className="docs-row-icon"><IconFile width={16} height={16} /></div>
            <div className="docs-row-main">
              <div className="docs-row-title">{d.tipo}</div>
              <div className="docs-row-sub" style={{ color: d.archivo ? "var(--muted)" : "var(--danger-dark)" }}>
                {d.archivo ? "documento.pdf" : "Sin adjuntar"}
              </div>
            </div>
            {d.dias !== null && <span className={`tag ${d.estado}`}>{d.dias}d</span>}
            <button className="icon-btn" type="button" title={d.archivo ? "Ver archivo" : "Adjuntar archivo"}>
              {d.archivo ? <IconEye /> : <IconFile />}
            </button>
          </div>
        ))}
        <ModalActions onCancel={() => setModalDocs(null)} cancelLabel="Cerrar" />
      </Modal>
    </AppShell>
  );
}
