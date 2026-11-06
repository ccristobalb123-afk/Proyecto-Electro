import { useEffect, useState } from "react";
import { Modal, ModalActions } from "../shared/Modal";
import { BotonCarga } from "../shared/Carga";
import Loading from "../shared/Loading";
import EstadoError from "../shared/EstadoError";
import { IconPlus, IconTrash, IconTruck, IconUser } from "../icons/Icons";
import { useAuth } from "../../context/AuthContext";
import { useConfirm } from "../../context/ConfirmContext";
import { useToast } from "../../context/ToastContext";
import { useAccion } from "../../hooks/useAccion";
import * as equiposService from "../../services/equiposService";
import { CAMPOS_EQUIPO } from "./camposEquipo";
import "./Asignacion.css";
import { AYUDA, CAMPO, ERROR_CAMPO, TITULO_CAMPO } from "../shared/clasesModal";

// Datos que puede pedir un tipo, en el orden en que se muestran (el mismo
// del backend). Las fechas de inspección y vencimiento se piden siempre.
const CAMPOS_ELEGIBLES = ["codigo", "marca", "pasos", "serial", "talla", "lote", "fechaFabricacion"];

const formVacio = () => ({ nombre: "", destino: "", variasPorDestinatario: false, camposRequeridos: ["codigo", "marca"] });

function errorDelForm(f) {
  if (f.nombre.trim().length < 2) return "Escribe el nombre del tipo (al menos 2 caracteres).";
  if (!f.destino) return "Elige a quién se asigna: Camión o Persona.";
  if (!f.camposRequeridos.includes("codigo") && !f.camposRequeridos.includes("serial")) {
    return "Elige al menos Código o Serial: con eso se identifica cada equipo.";
  }
  return "";
}

function FilaTipo({ tipo, esSuperAdmin, onEditar, onActivar, onEliminar, ocupado }) {
  return (
    <li className={`tipo-equipo ${tipo.activo ? "" : "tipo-equipo--inactivo"}`}>
      <div className="tipo-equipo__cabecera">
        <span className="tipo-equipo__nombre">{tipo.nombre}</span>
        <span className="tipo-equipo__chips">
          <span className="tipo-chip tipo-chip--destino">
            {tipo.destino === "camion" ? <IconTruck width={13} height={13} /> : <IconUser width={13} height={13} />}
            {tipo.destino === "camion" ? "Camión" : "Persona"}
          </span>
          {tipo.variasPorDestinatario && <span className="tipo-chip">Varias por {tipo.destino === "camion" ? "camión" : "persona"}</span>}
          {tipo.antigua ? <span className="tipo-chip tipo-chip--apagado">Heredado</span> : !tipo.activo && <span className="tipo-chip tipo-chip--apagado">Desactivado</span>}
        </span>
      </div>
      <p className="tipo-equipo__datos">
        {tipo.antigua
          ? "Tipo de la versión anterior: no se registran equipos nuevos."
          : `Pide: ${tipo.camposRequeridos.map((c) => CAMPOS_EQUIPO[c].etiqueta).join(", ")}, fechas de inspección y vencimiento.`}
      </p>
      <p className="tipo-equipo__conteo">
        {tipo.equipos} {tipo.equipos === 1 ? "equipo" : "equipos"}
        {tipo.asignados > 0 && ` · ${tipo.asignados} ${tipo.asignados === 1 ? "asignado" : "asignados"}`}
      </p>
      {esSuperAdmin && (
        <div className="tipo-equipo__acciones">
          <button className="btn-outline-sm" type="button" disabled={ocupado} onClick={() => onEditar(tipo)}>
            Corregir
          </button>
          <button className="btn-outline-sm" type="button" disabled={ocupado} onClick={() => onActivar(tipo)}>
            {tipo.activo ? "Desactivar" : "Reactivar"}
          </button>
          <button
            className="icon-btn icon-btn--peligro"
            type="button"
            title="Eliminar tipo"
            aria-label={`Eliminar el tipo ${tipo.nombre}`}
            disabled={ocupado}
            onClick={() => onEliminar(tipo)}
          >
            <IconTrash width={15} height={15} />
          </button>
        </div>
      )}
    </li>
  );
}

/**
 * Operaciones > Equipos > "Tipos de equipo": lista con las reglas de cada
 * tipo y el formulario para crear uno (cualquier usuario de Operaciones)
 * o corregirlo (solo SuperAdmin; los demás no ven esos botones y el
 * backend los rechaza igual). `onCambio` recarga los tipos y equipos de
 * la página. Se monta solo mientras está abierto.
 */
export default function ModalTiposEquipo({ open, onClose, onCambio }) {
  const { usuario } = useAuth();
  const esSuperAdmin = !!usuario?.esSuperAdmin;
  const { confirmar } = useConfirm();
  const { mostrarToast } = useToast();
  const acciones = useAccion();
  const guardando = acciones.ocupado("tipo");

  const [tipos, setTipos] = useState(null);
  const [errorCarga, setErrorCarga] = useState(null);
  const [editando, setEditando] = useState(null); // null = lista; { tipo? } = formulario (sin tipo: nuevo)
  const [f, setF] = useState(formVacio());
  const [error, setError] = useState("");

  async function cargar() {
    setErrorCarga(null);
    try {
      setTipos(await equiposService.listarTiposGestion());
    } catch (err) {
      setErrorCarga(err);
    }
  }

  // Se monta al abrirse (ver Operaciones.jsx): arranca en la lista.
  useEffect(() => {
    equiposService.listarTiposGestion().then(setTipos).catch(setErrorCarga);
  }, []);

  function abrirNuevo() {
    setF(formVacio());
    setError("");
    setEditando({});
  }

  function abrirCorregir(tipo) {
    setF({ nombre: tipo.nombre, destino: tipo.destino, variasPorDestinatario: tipo.variasPorDestinatario, camposRequeridos: [...tipo.camposRequeridos] });
    setError("");
    setEditando({ tipo });
  }

  const tipoEditado = editando?.tipo;
  // Los datos que pide no se cambian si el tipo ya tiene equipos.
  const camposBloqueados = !!tipoEditado && tipoEditado.equipos > 0;

  function alternarCampo(campo) {
    setF((prev) => ({
      ...prev,
      camposRequeridos: prev.camposRequeridos.includes(campo) ? prev.camposRequeridos.filter((c) => c !== campo) : [...prev.camposRequeridos, campo],
    }));
    setError("");
  }

  async function guardar(e) {
    e.preventDefault();
    const err = errorDelForm(f);
    setError(err);
    if (err) return;
    const campos = CAMPOS_ELEGIBLES.filter((c) => f.camposRequeridos.includes(c));
    await acciones.ejecutar("tipo", async () => {
      try {
        if (tipoEditado) {
          // Solo lo que cambió: el backend valida cada cambio por separado.
          const cambios = {};
          if (f.nombre.trim() !== tipoEditado.nombre) cambios.nombre = f.nombre.trim();
          if (f.destino !== tipoEditado.destino) cambios.destino = f.destino;
          if (f.variasPorDestinatario !== tipoEditado.variasPorDestinatario) cambios.variasPorDestinatario = f.variasPorDestinatario;
          if (campos.join() !== tipoEditado.camposRequeridos.join()) cambios.camposRequeridos = campos;
          if (Object.keys(cambios).length) await equiposService.actualizarTipo(tipoEditado.id, cambios);
          mostrarToast(`Tipo ${f.nombre.trim()} actualizado`, { tipo: "success" });
        } else {
          await equiposService.crearTipo({ nombre: f.nombre.trim(), destino: f.destino, variasPorDestinatario: f.variasPorDestinatario, camposRequeridos: campos });
          mostrarToast(`Tipo ${f.nombre.trim()} creado: ya puedes registrar equipos de este tipo`, { tipo: "success" });
        }
        setEditando(null);
        await cargar();
        onCambio();
      } catch (er) {
        setError(er.message || "No se pudo guardar el tipo.");
      }
    });
  }

  async function activar(tipo) {
    const desactivar = tipo.activo;
    const ok = await confirmar({
      titulo: `¿${desactivar ? "Desactivar" : "Reactivar"} el tipo ${tipo.nombre}?`,
      mensaje: desactivar
        ? `No se podrán registrar equipos nuevos de tipo ${tipo.nombre}. Los ${tipo.equipos} que ya existen siguen funcionando (asignar, inspeccionar, editar).`
        : `Se podrán volver a registrar equipos de tipo ${tipo.nombre}.`,
      textoConfirmar: desactivar ? "Desactivar" : "Reactivar",
      textoCargando: desactivar ? "Desactivando…" : "Reactivando…",
      accion: async () => {
        await equiposService.actualizarTipo(tipo.id, { activo: !desactivar });
        await cargar();
        onCambio();
      },
    });
    if (ok) mostrarToast(`Tipo ${tipo.nombre} ${desactivar ? "desactivado" : "reactivado"}`, { tipo: "success" });
  }

  // Con equipos, el backend responde 409 y el diálogo muestra el motivo
  // (sugiere desactivarlo).
  async function eliminar(tipo) {
    const ok = await confirmar({
      titulo: `¿Eliminar el tipo ${tipo.nombre}?`,
      mensaje: `Se eliminará el tipo de equipo "${tipo.nombre}". Solo se puede si no tiene ningún equipo registrado (tiene ${tipo.equipos}). Esta acción no se puede deshacer.`,
      tipo: "peligro",
      textoConfirmar: "Eliminar tipo",
      textoCargando: "Eliminando…",
      accion: async () => {
        await equiposService.eliminarTipo(tipo.id);
        await cargar();
        onCambio();
      },
    });
    if (ok) mostrarToast(`Tipo ${tipo.nombre} eliminado`, { tipo: "success" });
  }

  if (editando) {
    return (
      <Modal
        open={open}
        ocupado={guardando}
        title={tipoEditado ? `Corregir tipo: ${tipoEditado.nombre}` : "Nuevo tipo de equipo"}
        subtitle={tipoEditado ? "Solo SuperAdmin. Los cambios que dejarían datos inconsistentes se bloquean y se explica por qué." : "Define a quién se asigna y qué datos se piden al registrar cada equipo."}
        onClose={() => (guardando ? null : setEditando(null))}
      >
        <form onSubmit={guardar} noValidate>
          <div className={CAMPO}>
            <label>
              Nombre
              <input
                value={f.nombre}
                maxLength={60}
                placeholder="Ej. Detector de tensión"
                onChange={(e) => {
                  setF({ ...f, nombre: e.target.value });
                  setError("");
                }}
              />
            </label>
          </div>

          <fieldset className={CAMPO}>
            <legend className={TITULO_CAMPO}>Se asigna a</legend>
            <div className="destino-choice">
              {[["camion", "Camión", IconTruck], ["persona", "Persona", IconUser]].map(([valor, etiqueta, Icono]) => (
                <label key={valor} className={f.destino === valor ? "seleccionado" : ""}>
                  <input
                    type="radio"
                    name="tipo-destino"
                    checked={f.destino === valor}
                    onChange={() => {
                      setF({ ...f, destino: valor });
                      setError("");
                    }}
                  />
                  <Icono width={18} height={18} />
                  {etiqueta}
                </label>
              ))}
            </div>
          </fieldset>

          <div className={CAMPO}>
            <label className="tipo-check">
              <input type="checkbox" checked={f.variasPorDestinatario} onChange={(e) => setF({ ...f, variasPorDestinatario: e.target.checked })} />
              <span>
                Permite varias unidades por destinatario
                <small>Apagado: cada {f.destino === "camion" ? "camión" : f.destino === "persona" ? "persona" : "persona o camión"} tiene a lo sumo un equipo de este tipo.</small>
              </span>
            </label>
          </div>

          <fieldset className={CAMPO}>
            <legend className={TITULO_CAMPO}>Datos que se piden al registrar un equipo</legend>
            {camposBloqueados ? (
              <p className={AYUDA}>
                No se pueden cambiar: este tipo ya tiene {tipoEditado.equipos} {tipoEditado.equipos === 1 ? "equipo registrado" : "equipos registrados"} con estos datos.
              </p>
            ) : (
              <p className={AYUDA}>Todos los que marques serán obligatorios. Elige al menos Código o Serial (son únicos dentro del tipo).</p>
            )}
            <div className="tipo-campos">
              {CAMPOS_ELEGIBLES.map((c) => (
                <label key={c} className={`tipo-check tipo-check--caja ${f.camposRequeridos.includes(c) ? "seleccionado" : ""}`}>
                  <input type="checkbox" checked={f.camposRequeridos.includes(c)} disabled={camposBloqueados} onChange={() => alternarCampo(c)} />
                  <span>{CAMPOS_EQUIPO[c].etiqueta}</span>
                </label>
              ))}
              {["fechaInspeccion", "fechaVencimiento"].map((c) => (
                <label key={c} className="tipo-check tipo-check--caja tipo-check--fija">
                  <input type="checkbox" checked disabled />
                  <span>
                    {CAMPOS_EQUIPO[c].etiqueta}
                    <small>Siempre</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {error && (
            <p className={ERROR_CAMPO} role="alert">
              {error}
            </p>
          )}
          <ModalActions onCancel={() => setEditando(null)} cancelLabel="Volver">
            <BotonCarga type="submit" cargando={guardando} textoCargando="Guardando…">
              {tipoEditado ? "Guardar cambios" : "Crear tipo"}
            </BotonCarga>
          </ModalActions>
        </form>
      </Modal>
    );
  }

  return (
    <Modal open={open} wide title="Tipos de equipo" subtitle="A quién se asigna cada tipo y qué datos se piden al registrar sus equipos." onClose={onClose}>
      <div className="tipos-equipo__barra">
        <button className="btn-primary" type="button" onClick={abrirNuevo}>
          <IconPlus width={15} height={15} />
          Nuevo tipo
        </button>
        {!esSuperAdmin && <p className={AYUDA}>Corregir, desactivar o eliminar un tipo lo hace un SuperAdmin.</p>}
      </div>
      {!tipos && !errorCarga && <Loading texto="Cargando tipos…" />}
      {errorCarga && <EstadoError error={errorCarga} onReintentar={cargar} />}
      {tipos && (
        <ul className="tipos-equipo">
          {tipos.map((t) => (
            <FilaTipo key={t.id} tipo={t} esSuperAdmin={esSuperAdmin} onEditar={abrirCorregir} onActivar={activar} onEliminar={eliminar} ocupado={guardando} />
          ))}
        </ul>
      )}
      <ModalActions onCancel={onClose} cancelLabel="Cerrar" />
    </Modal>
  );
}
