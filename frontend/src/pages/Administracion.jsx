import { useState } from "react";
import { AppShell } from "../components/layout/AppShell";
import { Modal, ModalActions } from "../components/shared/Modal";
import ModalPasswordGenerada from "../components/administracion/ModalPasswordGenerada";
import { IconPlus, IconTrash } from "../components/icons/Icons";
import * as usuariosService from "../services/usuariosService";
import { MODULOS_DISPONIBLES } from "../services/rolesService";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";
import { useAuth } from "../context/AuthContext";
import { useDebounce } from "../hooks/useDebounce";
import { useAsyncList } from "../hooks/useAsyncList";
import { useModal } from "../hooks/useModal";
import { useAccion } from "../hooks/useAccion";
import { BotonCarga } from "../components/shared/Carga";
import Loading from "../components/shared/Loading";
import EstadoVacio from "../components/shared/EstadoVacio";
import EstadoError from "../components/shared/EstadoError";
import "./Administracion.css";

function iniciales(nombre) {
  return nombre.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function nombreModulo(id) {
  return MODULOS_DISPONIBLES.find((m) => m.id === id)?.nombre || id;
}

function formUsuarioVacio() {
  return { usuario: "", nombre: "", correo: "", esSuperAdmin: false, modulos: ["dashboard"], empresas: ["corevex", "electro"] };
}

export default function Administracion() {
  const { mostrarToast } = useToast();
  const { confirmar } = useConfirm();
  const acciones = useAccion();
  const guardando = acciones.ocupado("modal");
  const [errorReset, setErrorReset] = useState("");
  const { usuario: usuarioActual } = useAuth();
  const [busqueda, setBusqueda] = useState("");
  const busquedaDebounced = useDebounce(busqueda, 400);

  const modalNuevo = useModal();
  const modalEditar = useModal(); // dato = usuario seleccionado
  const modalReset = useModal(); // dato = usuario seleccionado

  const [fUsuario, setFUsuario] = useState(formUsuarioVacio());
  const [fUsuarioEditar, setFUsuarioEditar] = useState(formUsuarioVacio());
  const [errorUsuario, setErrorUsuario] = useState("");
  const [modalPassword, setModalPassword] = useState({ abierto: false, nombreUsuario: "", password: "", correoEnviado: true });

  // TODO backend: cuando exista paginación (punto 1.16), pasar
  // { page, pageSize } acá y guardar el total para el paginador.
  const {
    data: usuarios,
    setData: setUsuarios,
    loading: cargando,
    error,
    reload,
  } = useAsyncList(
    (signal) => usuariosService.listarUsuarios({ q: busquedaDebounced, signal }),
    [busquedaDebounced]
  );

  function abrirNuevo() {
    setFUsuario(formUsuarioVacio());
    setErrorUsuario("");
    modalNuevo.abrir();
  }

  function toggleEmpresa(empresa) {
    setFUsuario((prev) => {
      const tiene = prev.empresas.includes(empresa);
      const empresas = tiene ? prev.empresas.filter((e) => e !== empresa) : [...prev.empresas, empresa];
      return { ...prev, empresas };
    });
  }

  function toggleEmpresaEditar(empresa) {
    setFUsuarioEditar((prev) => {
      const tiene = prev.empresas.includes(empresa);
      const empresas = tiene ? prev.empresas.filter((e) => e !== empresa) : [...prev.empresas, empresa];
      return { ...prev, empresas };
    });
  }

  function toggleModulo(moduloId) {
    setFUsuario((prev) => {
      const tiene = prev.modulos.includes(moduloId);
      return { ...prev, modulos: tiene ? prev.modulos.filter((m) => m !== moduloId) : [...prev.modulos, moduloId] };
    });
  }

  function toggleModuloEditar(moduloId) {
    setFUsuarioEditar((prev) => {
      const tiene = prev.modulos.includes(moduloId);
      return { ...prev, modulos: tiene ? prev.modulos.filter((m) => m !== moduloId) : [...prev.modulos, moduloId] };
    });
  }

  function abrirEditar(u) {
    setFUsuarioEditar({
      usuario: u.usuario,
      nombre: u.nombre,
      correo: u.correo,
      esSuperAdmin: u.esSuperAdmin,
      modulos: u.modulos,
      empresas: u.empresas,
    });
    setErrorUsuario("");
    modalEditar.abrir(u);
  }

  async function handleGuardarUsuario(e) {
    e.preventDefault();
    setErrorUsuario("");
    if (!fUsuario.esSuperAdmin && fUsuario.modulos.length === 0) {
      setErrorUsuario("Marca al menos una ventana a la que este usuario pueda acceder.");
      return;
    }
    await acciones.ejecutar("modal", async () => {
      try {
        const { correoEnviado, passwordTemporal, ...nuevo } = await usuariosService.crearUsuario(fUsuario);
        setUsuarios((prev) => [nuevo, ...prev]);
        modalNuevo.cerrar();
        // El modal de la contraseña generada ya es la confirmación.
        setModalPassword({ abierto: true, nombreUsuario: nuevo.usuario, password: passwordTemporal, correoEnviado });
      } catch (err) {
        setErrorUsuario(err.message || "No se pudo crear el usuario.");
      }
    });
  }

  async function handleGuardarEdicion(e) {
    e.preventDefault();
    setErrorUsuario("");
    if (!fUsuarioEditar.esSuperAdmin && fUsuarioEditar.modulos.length === 0) {
      setErrorUsuario("Marca al menos una ventana a la que este usuario pueda acceder.");
      return;
    }
    await acciones.ejecutar("modal", async () => {
      try {
        const actualizado = await usuariosService.actualizarUsuario(modalEditar.dato.id, fUsuarioEditar);
        setUsuarios((prev) => prev.map((u) => (u.id === actualizado.id ? actualizado : u)));
        modalEditar.cerrar();
        mostrarToast("Usuario actualizado", { tipo: "success" });
      } catch (err) {
        setErrorUsuario(err.message || "No se pudieron guardar los cambios.");
      }
    });
  }

  async function handleConfirmarReset() {
    setErrorReset("");
    await acciones.ejecutar("modal", async () => {
      try {
        const { correoEnviado, passwordTemporal } = await usuariosService.resetearPassword(modalReset.dato.id);
        const nombreUsuario = modalReset.dato.usuario;
        modalReset.cerrar();
        setModalPassword({ abierto: true, nombreUsuario, password: passwordTemporal, correoEnviado });
      } catch (err) {
        setErrorReset(err.message || "No se pudo restablecer la contraseña.");
      }
    });
  }

  function reemplazarEnLista(actualizado) {
    setUsuarios((prev) => prev.map((u) => (u.id === actualizado.id ? actualizado : u)));
  }

  // Las mismas reglas que valida el backend, para no ofrecer botones
  // que solo devolverían un error: nadie se desactiva ni se elimina a
  // sí mismo, y solo un SuperAdmin gestiona a otro SuperAdmin.
  function puedeGestionar(u) {
    if (!usuarioActual || u.id === usuarioActual.id) return false;
    return !u.esSuperAdmin || usuarioActual.esSuperAdmin;
  }

  async function handleCambiarEstado(u) {
    const desactivar = u.activo;
    const ok = await confirmar({
      titulo: desactivar ? `¿Desactivar el acceso de ${u.nombre}?` : `¿Reactivar el acceso de ${u.nombre}?`,
      mensaje: desactivar
        ? "No podrá iniciar sesión y se cerrarán sus sesiones abiertas. Su historial se mantiene y puedes reactivarlo cuando quieras."
        : "Podrá volver a iniciar sesión normalmente, con los mismos permisos que tenía.",
      tipo: desactivar ? "peligro" : "normal",
      textoConfirmar: desactivar ? "Desactivar acceso" : "Reactivar acceso",
      textoCargando: desactivar ? "Desactivando…" : "Reactivando…",
      accion: async () => reemplazarEnLista(await usuariosService.cambiarEstadoUsuario(u.id, !u.activo)),
    });
    if (ok) mostrarToast(desactivar ? "Acceso desactivado" : "Acceso reactivado", { tipo: "success" });
  }

  async function handleEliminar(u) {
    const resultado = await confirmar({
      titulo: `¿Eliminar a ${u.nombre}?`,
      mensaje: `Se eliminará el usuario @${u.usuario} de forma permanente, junto con sus permisos y sesiones. Esta acción no se puede deshacer.`,
      tipo: "peligro",
      textoConfirmar: "Eliminar usuario",
      textoCargando: "Eliminando…",
      palabraConfirmacion: u.usuario,
      accion: async () => {
        await usuariosService.eliminarUsuario(u.id);
        setUsuarios((prev) => prev.filter((x) => x.id !== u.id));
      },
      // 409 = tiene historial a su nombre: en vez de dejarlo en un error,
      // se ofrece lo que sí se puede hacer (si todavía está activo).
      alternativa: (err) =>
        err.code === "USUARIO_CON_REGISTROS" && u.activo
          ? {
              titulo: `No se puede eliminar a ${u.nombre}`,
              texto: "Desactivar acceso",
              textoCargando: "Desactivando…",
              accion: async () => reemplazarEnLista(await usuariosService.cambiarEstadoUsuario(u.id, false)),
            }
          : null,
    });
    if (resultado === true) mostrarToast("Usuario eliminado", { tipo: "success" });
    if (resultado === "alternativa") mostrarToast("Acceso desactivado", { tipo: "success" });
  }


  const usuariosFiltrados = usuarios;

  return (
    <AppShell
      title="Administración"
      topbarExtra={
        <button className="btn-primary" onClick={abrirNuevo} type="button">
          <IconPlus width={15} height={15} />
          <span className="topbar-accion-texto">Nuevo usuario</span>
        </button>
      }
    >
      <div className="filters">
        <div className="search">
          <label htmlFor="buscar-usuarios" className="sr-only">Buscar nombre o correo</label>
          <input id="buscar-usuarios" type="search" placeholder="Buscar nombre o correo..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
      </div>

      {cargando ? (
        <Loading texto="Cargando usuarios…" />
      ) : error ? (
        <EstadoError error={error} onReintentar={reload} />
      ) : usuariosFiltrados.length === 0 ? (
        <EstadoVacio
          titulo={busqueda ? "No hay usuarios que coincidan con la búsqueda" : "No hay usuarios registrados todavía"}
          descripcion={busqueda ? "Prueba con otro término." : undefined}
          accionLabel={busqueda ? undefined : "Nuevo usuario"}
          onAccion={abrirNuevo}
        />
      ) : (
        <div className="usuarios-grid">
          {usuariosFiltrados.map((u) => (
            <div className={`usuario-card ${!u.activo ? "usuario-card--inactivo" : ""}`} key={u.id}>
              <div className="usuario-card-top">
                <div className="usuario-avatar">{iniciales(u.nombre)}</div>
                <div className="usuario-card-info">
                  <div className="usuario-card-nombre">{u.nombre}</div>
                  <div className="usuario-card-correo">@{u.usuario} · {u.correo}</div>
                </div>
                {u.esSuperAdmin && <span className="rol-badge rol-superadmin">SuperAdmin</span>}
              </div>

              <div className="usuario-card-body">
                <span className="usuario-card-label">Acceso a</span>
                <div className="usuario-card-empresas">
                  {u.empresas.map((e) => (
                    <span key={e} className={`co-badge ${e}`}>{e === "corevex" ? "Corevex" : "Electro"}</span>
                  ))}
                </div>
                <div className="usuario-card-modulos">
                  {u.modulos.map((m) => (
                    <span key={m} className="modulo-pill">{nombreModulo(m)}</span>
                  ))}
                </div>
                {!u.activo && <span className="usuario-inactivo-tag">Acceso desactivado</span>}
              </div>

              <div className="usuario-card-footer">
                <button className="btn-outline-sm" type="button" onClick={() => { setErrorReset(""); modalReset.abrir(u); }}>
                  Restablecer contraseña
                </button>
                <button className="btn-outline-sm" type="button" onClick={() => abrirEditar(u)}>Editar</button>
                {puedeGestionar(u) && (
                  <>
                    <button className="btn-outline-sm" type="button" onClick={() => handleCambiarEstado(u)}>
                      {u.activo ? "Desactivar" : "Reactivar"}
                    </button>
                    <button
                      className="icon-btn icon-btn--peligro"
                      type="button"
                      title="Eliminar usuario"
                      aria-label={`Eliminar a ${u.nombre}`}
                      onClick={() => handleEliminar(u)}
                    >
                      <IconTrash />
                    </button>
                  </>
                )}
                {usuarioActual?.id === u.id && <span className="usuario-tu-tag">Tu cuenta</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== Modal: Nuevo usuario ===== */}
      <Modal open={modalNuevo.abierto} ocupado={guardando} title="Nuevo usuario" subtitle="El usuario recibirá una contraseña temporal en su correo." onClose={modalNuevo.cerrar}>
        <form onSubmit={handleGuardarUsuario}>
          <div className="form-field">
            <label>
              Nombre completo
              <input required value={fUsuario.nombre} onChange={(e) => setFUsuario({ ...fUsuario, nombre: e.target.value })} placeholder="Ej. Milagros Ríos" />
            </label>
          </div>
          <div className="form-field">
            <label>
              Usuario (para iniciar sesión)
              <input required value={fUsuario.usuario} onChange={(e) => setFUsuario({ ...fUsuario, usuario: e.target.value })} placeholder="Ej. mrios" />
            </label>
          </div>
          <div className="form-field">
            <label>
              Correo (solo para recuperar la contraseña)
              <input required type="email" value={fUsuario.correo} onChange={(e) => setFUsuario({ ...fUsuario, correo: e.target.value })} placeholder="nombre@corevex.pe" />
            </label>
          </div>
          <div className="form-field">
            <label className="superadmin-toggle">
              <input type="checkbox" checked={fUsuario.esSuperAdmin} onChange={(e) => setFUsuario({ ...fUsuario, esSuperAdmin: e.target.checked })} />
              <div>
                <strong>SuperAdmin</strong>
                <span>Control total del sistema — acceso a todas las ventanas y pide código de verificación (MFA)</span>
              </div>
            </label>
          </div>
          {!fUsuario.esSuperAdmin && (
            <fieldset className="form-field">
              <legend>Ventanas con acceso</legend>
              <div className="modulos-check">
                {MODULOS_DISPONIBLES.map((m) => (
                  <label key={m.id} className={fUsuario.modulos.includes(m.id) ? "sel" : ""}>
                    <input type="checkbox" checked={fUsuario.modulos.includes(m.id)} onChange={() => toggleModulo(m.id)} />
                    {m.nombre}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <fieldset className="form-field">
            <legend>Empresas con acceso</legend>
            <p className="empresas-check-hint">Puedes marcar las dos si trabaja para ambas empresas.</p>
            <div className="empresas-check">
              <label className={fUsuario.empresas.includes("corevex") ? "sel-corevex" : ""}>
                <input type="checkbox" checked={fUsuario.empresas.includes("corevex")} onChange={() => toggleEmpresa("corevex")} />
                CorevexSAC
              </label>
              <label className={fUsuario.empresas.includes("electro") ? "sel-electro" : ""}>
                <input type="checkbox" checked={fUsuario.empresas.includes("electro")} onChange={() => toggleEmpresa("electro")} />
                ElectroSAC
              </label>
            </div>
          </fieldset>
          {errorUsuario && <p className="field-error" role="alert">{errorUsuario}</p>}
          <ModalActions onCancel={modalNuevo.cerrar}>
            <BotonCarga type="submit" cargando={guardando} textoCargando="Creando usuario…">
              Crear usuario
            </BotonCarga>
          </ModalActions>
        </form>
      </Modal>

      {/* ===== Modal: Editar usuario ===== */}
      <Modal open={modalEditar.abierto} ocupado={guardando} title="Editar usuario" subtitle={modalEditar.dato ? modalEditar.dato.nombre : ""} onClose={modalEditar.cerrar}>
        <form onSubmit={handleGuardarEdicion}>
          <div className="form-field">
            <label>
              Nombre completo
              <input required value={fUsuarioEditar.nombre} onChange={(e) => setFUsuarioEditar({ ...fUsuarioEditar, nombre: e.target.value })} placeholder="Ej. Milagros Ríos" />
            </label>
          </div>
          <div className="form-field">
            <label>
              Usuario (para iniciar sesión)
              <input required value={fUsuarioEditar.usuario} onChange={(e) => setFUsuarioEditar({ ...fUsuarioEditar, usuario: e.target.value })} placeholder="Ej. mrios" />
            </label>
          </div>
          <div className="form-field">
            <label>
              Correo (solo para recuperar la contraseña)
              <input required type="email" value={fUsuarioEditar.correo} onChange={(e) => setFUsuarioEditar({ ...fUsuarioEditar, correo: e.target.value })} placeholder="nombre@corevex.pe" />
            </label>
          </div>
          <div className="form-field">
            <label className="superadmin-toggle">
              <input type="checkbox" checked={fUsuarioEditar.esSuperAdmin} onChange={(e) => setFUsuarioEditar({ ...fUsuarioEditar, esSuperAdmin: e.target.checked })} />
              <div>
                <strong>SuperAdmin</strong>
                <span>Control total del sistema — acceso a todas las ventanas y pide código de verificación (MFA)</span>
              </div>
            </label>
          </div>
          {!fUsuarioEditar.esSuperAdmin && (
            <fieldset className="form-field">
              <legend>Ventanas con acceso</legend>
              <div className="modulos-check">
                {MODULOS_DISPONIBLES.map((m) => (
                  <label key={m.id} className={fUsuarioEditar.modulos.includes(m.id) ? "sel" : ""}>
                    <input type="checkbox" checked={fUsuarioEditar.modulos.includes(m.id)} onChange={() => toggleModuloEditar(m.id)} />
                    {m.nombre}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <fieldset className="form-field">
            <legend>Empresas con acceso</legend>
            <p className="empresas-check-hint">Puedes marcar las dos si trabaja para ambas empresas.</p>
            <div className="empresas-check">
              <label className={fUsuarioEditar.empresas.includes("corevex") ? "sel-corevex" : ""}>
                <input type="checkbox" checked={fUsuarioEditar.empresas.includes("corevex")} onChange={() => toggleEmpresaEditar("corevex")} />
                CorevexSAC
              </label>
              <label className={fUsuarioEditar.empresas.includes("electro") ? "sel-electro" : ""}>
                <input type="checkbox" checked={fUsuarioEditar.empresas.includes("electro")} onChange={() => toggleEmpresaEditar("electro")} />
                ElectroSAC
              </label>
            </div>
          </fieldset>
          {errorUsuario && <p className="field-error" role="alert">{errorUsuario}</p>}
          <ModalActions onCancel={modalEditar.cerrar}>
            <BotonCarga type="submit" cargando={guardando} textoCargando="Guardando…">
              Guardar cambios
            </BotonCarga>
          </ModalActions>
        </form>
      </Modal>

      {/* ===== Modal: Restablecer contraseña ===== */}
      <Modal
        open={modalReset.abierto}
        ocupado={guardando}
        title="Restablecer contraseña"
        subtitle={modalReset.dato ? `Se generará una contraseña temporal para ${modalReset.dato.nombre}.` : ""}
        onClose={modalReset.cerrar}
      >
        <p className="usuario-modal-texto">
          {modalReset.dato?.nombre} tendrá que cambiarla la próxima vez que inicie sesión.
        </p>
        {errorReset && <p className="field-error" role="alert">{errorReset}</p>}
        <ModalActions onCancel={modalReset.cerrar}>
          <BotonCarga cargando={guardando} textoCargando="Generando…" onClick={handleConfirmarReset}>
            Generar contraseña temporal
          </BotonCarga>
        </ModalActions>
      </Modal>


      <ModalPasswordGenerada
        open={modalPassword.abierto}
        onClose={() => setModalPassword({ ...modalPassword, abierto: false })}
        nombreUsuario={modalPassword.nombreUsuario}
        password={modalPassword.password}
        correoEnviado={modalPassword.correoEnviado}
      />
    </AppShell>
  );
}
