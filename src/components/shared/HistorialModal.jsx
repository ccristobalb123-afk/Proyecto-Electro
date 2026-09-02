import { Modal, Timeline } from "./Modal";

function formatFechaHora(iso) {
  const f = new Date(iso);
  const dd = String(f.getDate()).padStart(2, "0");
  const mm = String(f.getMonth() + 1).padStart(2, "0");
  const yyyy = f.getFullYear();
  const hh = String(f.getHours()).padStart(2, "0");
  const min = String(f.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

// TODO backend: GET /api/historial?modulo=<modulo>&refId=<id> (tabla
// RegistroActividad) — trae quién hizo qué y cuándo sobre un registro
// puntual (ej. "quién editó esta factura"). Mientras no exista, este
// modal recibe `entradas` ya cargadas por quien lo abre.
export default function HistorialModal({ open, tituloModulo, entradas = [], cargando, onClose }) {
  const items = entradas.map((h) => ({
    titulo: `${h.accion}${h.usuario ? ` — ${h.usuario}` : ""}${h.detalle ? `: ${h.detalle}` : ""}`,
    fecha: formatFechaHora(h.fechaHora),
  }));

  return (
    <Modal open={open} title={`Historial de cambios — ${tituloModulo}`} onClose={onClose}>
      {cargando ? (
        <p style={{ fontSize: 13, color: "var(--muted)", padding: "20px 0" }}>Cargando...</p>
      ) : (
        <Timeline items={items} />
      )}
    </Modal>
  );
}
