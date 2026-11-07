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
import { AYUDA, AYUDA_TEXTO, CAMPO, ERROR_CAMPO, TITULO_CAMPO } from "../shared/clasesModal";

// ---------- Lista de tipos ----------
const BARRA = "mb-4 flex flex-wrap items-center gap-x-3 gap-y-2";
const LISTA = "mx-0 mt-0 mb-2 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-3 p-0";
// Desactivado o heredado: fondo gris y nombre atenuado (con su etiqueta).
const TIPO = "flex min-w-0 flex-col gap-2 rounded border border-border px-4 py-3";
const TIPO_ACTIVO = `${TIPO} [background:var(--card)]`;
const TIPO_INACTIVO = `${TIPO} [background:var(--gray-tint)]`;
const TIPO_CABECERA = "flex flex-wrap items-center justify-between gap-x-2.5 gap-y-1.5";
const NOMBRE = "text-md font-semibold wrap-anywhere";
const CHIPS = "flex flex-wrap gap-1.5";
const CHIP = "inline-flex items-center gap-1 rounded-[999px] px-2 py-0.5 text-xs font-semibold";
const CHIP_NORMAL = `${CHIP} bg-copper-tint text-copper-dark`;
const CHIP_DESTINO = `${CHIP} bg-electro-tint text-electro-dark`;
const CHIP_APAGADO = `${CHIP} [border:1px_dashed_var(--border-control)] [background:var(--card)] text-gray-dark`;
const DATOS = "m-0 text-sm text-muted";
const CONTEO = `${DATOS} tabular-nums`;
const ACCIONES = "mt-auto flex flex-wrap gap-2";
const ACCION = "btn-outline-sm flex-auto justify-center";

// ---------- Formulario ----------
// Las etiquetas van dentro de CAMPO, cuya regla [&_label] (0-1-1) les ganaría
// el display, el margen y la letra: por eso [&&]: (0-2-0).
const DESTINO = "flex gap-2.5";
const DESTINO_OPCION = "[&&]:flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded border-[1.5px] px-3 py-2 [&&]:text-[15px] font-medium";
const DESTINO_NORMAL = `${DESTINO_OPCION} border-border text-muted`;
const DESTINO_ELEGIDO = `${DESTINO_OPCION} border-copper bg-copper-tint text-copper-dark`;
const DESTINO_RADIO = "m-0 h-auto w-auto";
const CHECK = "[&&]:m-0 [&&]:flex gap-2.5 [&&]:text-base font-medium";
const CHECK_SIMPLE = `${CHECK} cursor-pointer items-start text-text`;
// Casillas en caja (datos que se piden): marcada en cobre; las fechas, fijas y en gris.
const CHECK_CAJA = `${CHECK} min-h-11 items-center rounded border-[1.5px] px-3 py-2`;
const CHECK_CAJA_NORMAL = `${CHECK_CAJA} cursor-pointer border-border text-text`;
const CHECK_CAJA_ELEGIDA = `${CHECK_CAJA} cursor-pointer border-copper bg-copper-tint text-copper-dark`;
const CHECK_CAJA_FIJA = `${CHECK_CAJA} cursor-default border-border bg-gray-tint text-muted`;
const CHECK_CASILLA = "mt-0.5 size-4 flex-none";
const CHECK_DETALLE = "block text-sm font-regular text-muted";
const CAMPOS = "grid grid-cols-[repeat(auto-fill,minmax(min(100%,170px),1fr))] gap-2";

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
    <li className={tipo.activo ? TIPO_ACTIVO : TIPO_INACTIVO}>
      <div className={TIPO_CABECERA}>
        <span className={`${NOMBRE} ${tipo.activo ? "text-text" : "text-muted"}`}>{tipo.nombre}</span>
        <span className={CHIPS}>
          <span className={CHIP_DESTINO}>
            {tipo.destino === "camion" ? <IconTruck width={13} height={13} /> : <IconUser width={13} height={13} />}
            {tipo.destino === "camion" ? "Camión" : "Persona"}
          </span>
          {tipo.variasPorDestinatario && <span className={CHIP_NORMAL}>Varias por {tipo.destino === "camion" ? "camión" : "persona"}</span>}
          {tipo.antigua ? <span className={CHIP_APAGADO}>Heredado</span> : !tipo.activo && <span className={CHIP_APAGADO}>Desactivado</span>}
        </span>
      </div>
      <p className={DATOS}>
        {tipo.antigua
          ? "Tipo de la versión anterior: no se registran equipos nuevos."
          : `Pide: ${tipo.camposRequeridos.map((c) => CAMPOS_EQUIPO[c].etiqueta).join(", ")}, fechas de inspección y vencimiento.`}
      </p>
      <p className={CONTEO}>
        {tipo.equipos} {tipo.equipos === 1 ? "equipo" : "equipos"}
        {tipo.asignados > 0 && ` · ${tipo.asignados} ${tipo.asignados === 1 ? "asignado" : "asignados"}`}
      </p>
      {esSuperAdmin && (
        <div className={ACCIONES}>
          <button className={ACCION} type="button" disabled={ocupado} onClick={() => onEditar(tipo)}>
            Corregir
          </button>
          <button className={ACCION} type="button" disabled={ocupado} onClick={() => onActivar(tipo)}>
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
            <div className={DESTINO}>
              {[["camion", "Camión", IconTruck], ["persona", "Persona", IconUser]].map(([valor, etiqueta, Icono]) => (
                <label key={valor} className={f.destino === valor ? DESTINO_ELEGIDO : DESTINO_NORMAL}>
                  <input
                    className={DESTINO_RADIO}
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
            <label className={CHECK_SIMPLE}>
              <input className={CHECK_CASILLA} type="checkbox" checked={f.variasPorDestinatario} onChange={(e) => setF({ ...f, variasPorDestinatario: e.target.checked })} />
              <span>
                Permite varias unidades por destinatario
                <small className={CHECK_DETALLE}>Apagado: cada {f.destino === "camion" ? "camión" : f.destino === "persona" ? "persona" : "persona o camión"} tiene a lo sumo un equipo de este tipo.</small>
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
            <div className={CAMPOS}>
              {CAMPOS_ELEGIBLES.map((c) => (
                <label key={c} className={f.camposRequeridos.includes(c) ? CHECK_CAJA_ELEGIDA : CHECK_CAJA_NORMAL}>
                  <input className={CHECK_CASILLA} type="checkbox" checked={f.camposRequeridos.includes(c)} disabled={camposBloqueados} onChange={() => alternarCampo(c)} />
                  <span>{CAMPOS_EQUIPO[c].etiqueta}</span>
                </label>
              ))}
              {["fechaInspeccion", "fechaVencimiento"].map((c) => (
                <label key={c} className={CHECK_CAJA_FIJA}>
                  <input className={CHECK_CASILLA} type="checkbox" checked disabled />
                  <span>
                    {CAMPOS_EQUIPO[c].etiqueta}
                    <small className={CHECK_DETALLE}>Siempre</small>
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
      <div className={BARRA}>
        <button className="btn-primary" type="button" onClick={abrirNuevo}>
          <IconPlus width={15} height={15} />
          Nuevo tipo
        </button>
        {!esSuperAdmin && <p className={`m-0 ${AYUDA_TEXTO}`}>Corregir, desactivar o eliminar un tipo lo hace un SuperAdmin.</p>}
      </div>
      {!tipos && !errorCarga && <Loading texto="Cargando tipos…" />}
      {errorCarga && <EstadoError error={errorCarga} onReintentar={cargar} />}
      {tipos && (
        <ul className={LISTA}>
          {tipos.map((t) => (
            <FilaTipo key={t.id} tipo={t} esSuperAdmin={esSuperAdmin} onEditar={abrirCorregir} onActivar={activar} onEliminar={eliminar} ocupado={guardando} />
          ))}
        </ul>
      )}
      <ModalActions onCancel={onClose} cancelLabel="Cerrar" />
    </Modal>
  );
}
