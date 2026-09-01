import { useState } from "react";
import { AppShell } from "../components/layout/AppShell";
import { Modal, ModalActions, CompanyChoice, AvisoVencimiento } from "../components/shared/Modal";
import { IconPlus, IconEye, IconFile, IconUpload } from "../components/icons/Icons";
import "./Rrhh.css";

// TODO backend: GET /api/contratos?empresa=&estado=&q= (tabla Contrato)
const CONTRATOS_INICIALES = [
  { id: 1, trabajador: "J. Ramírez Soto", iniciales: "JR", empresa: "corevex", tipo: "Plazo fijo", vence: "28 ago 2026", estado: "vencido", archivo: true },
  { id: 2, trabajador: "S. Vega Luna", iniciales: "SV", empresa: "electro", tipo: "Indefinido", vence: "01 sep 2026", estado: "porvencer", archivo: true },
  { id: 3, trabajador: "Milagros Ríos", iniciales: "MR", empresa: "corevex", tipo: "Plazo fijo", vence: "14 nov 2026", estado: "vigente", archivo: true },
  { id: 4, trabajador: "Alonso Torres", iniciales: "AT", empresa: "electro", tipo: "Indefinido", vence: "03 dic 2026", estado: "vigente", archivo: true },
  { id: 5, trabajador: "Pedro Castañeda", iniciales: "PC", empresa: "corevex", tipo: "Plazo fijo", vence: "20 jun 2026", estado: "renovado", archivo: true },
  { id: 6, trabajador: "Lucía Farfán", iniciales: "LF", empresa: "electro", tipo: "Plazo fijo", vence: "10 mar 2026", estado: "terminado", archivo: false },
];

// TODO backend: GET /api/cursos-certificaciones?empresa=&tipo=&q= (tabla CursoCertificacion)
const CURSOS_INICIALES = [
  { id: 1, trabajador: "J. Ramírez Soto", iniciales: "JR", empresa: "corevex", tipo: "EMO", vence: "26 ago 2026", estado: "vencido" },
  { id: 2, trabajador: "Milagros Ríos", iniciales: "MR", empresa: "corevex", tipo: "Fotocheck", vence: "15 sep 2026", estado: "porvencer" },
  { id: 3, trabajador: "Alonso Torres", iniciales: "AT", empresa: "electro", tipo: "Curso", vence: "20 dic 2026", estado: "vigente" },
];

const ESTADO_LABEL = {
  vigente: "Vigente",
  porvencer: "Por vencer",
  vencido: "Vencido",
  renovado: "Renovado",
  terminado: "Terminado",
};

const TRABAJADORES = ["J. Ramírez Soto", "S. Vega Luna", "Milagros Ríos", "Alonso Torres", "Pedro Castañeda"];

function estadoDesdeFecha(fechaFin) {
  // TODO backend: esta lógica de "¿qué estado calculamos?" vive en el
  // servicio de Contrato (patrón State), no en el frontend — aquí solo
  // se muestra el estado que ya viene calculado desde la API.
  return "vigente";
}

export default function Rrhh() {
  const [tab, setTab] = useState("contratos"); // "contratos" | "cursos"
  const [contratos, setContratos] = useState(CONTRATOS_INICIALES);
  const [cursos, setCursos] = useState(CURSOS_INICIALES);
  const [modalOpen, setModalOpen] = useState(false);

  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [busqueda, setBusqueda] = useState("");

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

  const dataActual = tab === "contratos" ? contratos : cursos;
  const listaFiltrada = dataActual.filter((item) => {
    if (filtroEmpresa && item.empresa !== filtroEmpresa) return false;
    if (filtroEstado && item.estado !== filtroEstado) return false;
    if (busqueda && !item.trabajador.toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  });

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
    // TODO backend: POST /api/contratos { ...fContrato }
    // El backend calcula el estado inicial (Vigente/Por vencer) según
    // fechaFin, y si fechaFin - diasAnticipacion <= hoy, crea la Alerta.
    const nuevo = {
      id: Date.now(),
      trabajador: fContrato.trabajador,
      iniciales: fContrato.trabajador.split(" ").map((p) => p[0]).slice(0, 2).join(""),
      empresa: fContrato.empresa,
      tipo: fContrato.tipo,
      vence: fContrato.fechaFin,
      estado: "vigente",
      archivo: !!fContrato.archivoNombre,
    };
    setContratos((prev) => [nuevo, ...prev]);
    setModalOpen(false);
  }

  async function handleGuardarCurso(e) {
    e.preventDefault();
    if (!fCurso.trabajador || !fCurso.fechaInicio || !fCurso.fechaVencimiento) {
      setErrorCurso("Completa trabajador, fecha de inicio y fecha de vencimiento.");
      return;
    }
    // TODO backend: POST /api/cursos-certificaciones { ...fCurso }
    const nuevo = {
      id: Date.now(),
      trabajador: fCurso.trabajador,
      iniciales: fCurso.trabajador.split(" ").map((p) => p[0]).slice(0, 2).join(""),
      empresa: fCurso.empresa,
      tipo: fCurso.tipo,
      vence: fCurso.fechaVencimiento,
      estado: "vigente",
    };
    setCursos((prev) => [nuevo, ...prev]);
    setModalOpen(false);
  }

  function handleArchivoChange(e) {
    const file = e.target.files?.[0];
    setFContrato((f) => ({ ...f, archivoNombre: file ? file.name : "" }));
  }

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

      <table>
        <thead>
          <tr>
            <th>Trabajador</th>
            <th>Empresa</th>
            <th>Tipo</th>
            <th>Vence</th>
            {tab === "contratos" && <th>Documento</th>}
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {listaFiltrada.map((item) => (
            <tr key={item.id}>
              <td>
                <div className="worker">
                  <div className="mini-avatar">{item.iniciales}</div>
                  <span>{item.trabajador}</span>
                </div>
              </td>
              <td>
                <span className={`co-badge ${item.empresa}`}>
                  {item.empresa === "corevex" ? "Corevex" : "Electro"}
                </span>
              </td>
              <td>{item.tipo}</td>
              <td className="code">{item.vence}</td>
              {tab === "contratos" && (
                <td>
                  {item.archivo ? (
                    <button className="doc-chip" type="button">
                      <IconFile width={13} height={13} />
                      Ver PDF
                    </button>
                  ) : (
                    <span className="sin-adjuntar">Sin adjuntar</span>
                  )}
                </td>
              )}
              <td>
                <span className={`estado ${item.estado}`}>
                  <i />
                  {ESTADO_LABEL[item.estado]}
                </span>
              </td>
              <td>
                <button className="icon-btn" type="button" title="Ver detalle">
                  <IconEye />
                </button>
              </td>
            </tr>
          ))}
          {listaFiltrada.length === 0 && (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", color: "var(--muted-2)", padding: 24 }}>
                No hay resultados con estos filtros.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ===== Modal: Nuevo contrato ===== */}
      <Modal
        open={modalOpen && tab === "contratos"}
        title="Nuevo contrato"
        subtitle="Completa los datos del contrato."
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleGuardarContrato}>
          <div className="form-field">
            <label>Trabajador</label>
            <select
              value={fContrato.trabajador}
              onChange={(e) => setFContrato({ ...fContrato, trabajador: e.target.value })}
            >
              <option value="">Selecciona un trabajador...</option>
              {TRABAJADORES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Empresa</label>
            <CompanyChoice
              name="empresaContrato"
              value={fContrato.empresa}
              onChange={(v) => setFContrato({ ...fContrato, empresa: v })}
            />
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Tipo de contrato</label>
              <select
                value={fContrato.tipo}
                onChange={(e) => setFContrato({ ...fContrato, tipo: e.target.value })}
              >
                <option>Plazo fijo</option>
                <option>Indefinido</option>
              </select>
            </div>
            <div className="form-field">
              <label>Fecha de inicio</label>
              <input
                type="date"
                value={fContrato.fechaInicio}
                onChange={(e) => setFContrato({ ...fContrato, fechaInicio: e.target.value })}
              />
            </div>
          </div>

          <div className="form-field">
            <label>Fecha de fin</label>
            <input
              type="date"
              value={fContrato.fechaFin}
              onChange={(e) => setFContrato({ ...fContrato, fechaFin: e.target.value })}
            />
          </div>

          <AvisoVencimiento
            value={fContrato.diasAnticipacion}
            onChange={(v) => setFContrato({ ...fContrato, diasAnticipacion: v })}
            hint="días antes de la fecha de fin"
          />

          <div className="form-field">
            <label>Documento del contrato</label>
            <label className={`dropzone ${fContrato.archivoNombre ? "has-file" : ""}`}>
              <IconUpload width={22} height={22} />
              <p>
                {fContrato.archivoNombre ? (
                  <b>{fContrato.archivoNombre}</b>
                ) : (
                  <>
                    <b>Haz clic para subir</b> o arrastra el archivo — PDF o foto
                  </>
                )}
              </p>
              <input type="file" accept=".pdf,image/*" onChange={handleArchivoChange} hidden />
            </label>
          </div>

          {errorContrato && <p className="field-error">{errorContrato}</p>}

          <ModalActions onCancel={() => setModalOpen(false)}>
            <button className="btn-primary" type="submit">
              Guardar contrato
            </button>
          </ModalActions>
        </form>
      </Modal>

      {/* ===== Modal: Nuevo Curso/Fotocheck/EMO ===== */}
      <Modal
        open={modalOpen && tab === "cursos"}
        title="Nuevo registro"
        subtitle="Completa los datos del curso, fotocheck o EMO."
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleGuardarCurso}>
          <div className="form-field">
            <label>Trabajador</label>
            <select
              value={fCurso.trabajador}
              onChange={(e) => setFCurso({ ...fCurso, trabajador: e.target.value })}
            >
              <option value="">Selecciona un trabajador...</option>
              {TRABAJADORES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Empresa</label>
              <CompanyChoice
                name="empresaCurso"
                value={fCurso.empresa}
                onChange={(v) => setFCurso({ ...fCurso, empresa: v })}
              />
            </div>
            <div className="form-field">
              <label>Tipo</label>
              <select value={fCurso.tipo} onChange={(e) => setFCurso({ ...fCurso, tipo: e.target.value })}>
                <option>Curso</option>
                <option>Fotocheck</option>
                <option>EMO</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Fecha de inicio</label>
              <input
                type="date"
                value={fCurso.fechaInicio}
                onChange={(e) => setFCurso({ ...fCurso, fechaInicio: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label>Fecha de vencimiento</label>
              <input
                type="date"
                value={fCurso.fechaVencimiento}
                onChange={(e) => setFCurso({ ...fCurso, fechaVencimiento: e.target.value })}
              />
            </div>
          </div>

          <AvisoVencimiento
            value={fCurso.diasAnticipacion}
            onChange={(v) => setFCurso({ ...fCurso, diasAnticipacion: v })}
          />

          {errorCurso && <p className="field-error">{errorCurso}</p>}

          <ModalActions onCancel={() => setModalOpen(false)}>
            <button className="btn-primary" type="submit">
              Guardar registro
            </button>
          </ModalActions>
        </form>
      </Modal>
    </AppShell>
  );
}
