import { useState } from "react";
import { AppShell } from "../components/layout/AppShell";
import { Modal, ModalActions } from "../components/shared/Modal";
import ModalPasswordGenerada from "../components/administracion/ModalPasswordGenerada";
import { IconPlus, IconTrash } from "../components/icons/Icons";
import * as usuariosService from "../services/usuariosService";
import { MODULOS_DISPONIBLES } from "../services/rolesService";
import { useToast } from "../context/ToastContext";
import { useDebounce } from "../hooks/useDebounce";
import { useAsyncList } from "../hooks/useAsyncList";
import { useModal } from "../hooks/useModal";
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
  const [busqueda, setBusqueda] = useState("");
  const busquedaDebounced = useDebounce(busqueda, 400);

  const modalNuevo = useModal();
  const modalEditar = useModal(); // dato = usuario seleccionado
  const modalReset = useModal(); // dato = usuario seleccionado
  const modalDesactivar = useModal(); // dato = usuario seleccionado

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
    try {
      const { correoEnviado, passwordTemporal, ...nuevo } = await usuariosService.crearUsuario(fUsuario);
      setUsuarios((prev) => [nuevo, ...prev]);
      modalNuevo.cerrar();
      setModalPassword({ abierto: true, nombreUsuario: nuevo.usuario, password: passwordTemporal, correoEnviado });
    } catch (err) {
      setErrorUsuario(err.message || "No se pudo crear el usuario.");
    }
  }

  async function handleGuardarEdicion(e) {
    e.preventDefault();
    setErrorUsuario("");
    if (!fUsuarioEditar.esSuperAdmin && fUsuarioEditar.modulos.length === 0) {
      setErrorUsuario("Marca al menos una ventana a la que este usuario pueda acceder.");
      return;
    }
    try {
      const actualizado = await usuariosService.actualizarUsuario(modalEditar.dato.id, fUsuarioEditar);
      setUsuarios((prev) => prev.map((u) => (u.id === actualizado.id ? actualizado : u)));
      modalEditar.cerrar();
    } catch (err) {
      setErrorUsuario(err.message || "No se pudo guardar los cambios.");
    }
  }

  async function handleConfirmarReset() {
    try {
      const { correoEnviado, passwordTemporal } = await usuariosService.resetearPassword(modalReset.dato.id);
      const nombreUsuario = modalReset.dato.usuario;
      modalReset.cerrar();
      setModalPassword({ abierto: true, nombreUsuario, password: passwordTemporal, correoEnviado });
    } catch (err) {
      mostrarToast(err.message || "No se pudo resetear la contraseña.", { tipo: "error" });
    }
  }

  async function handleConfirmarDesactivar() {
    try {
      const actualizado = await usuariosService.cambiarEstadoUsuario(modalDesactivar.dato.id, !modalDesactivar.dato.activo);
      setUsuarios((prev) => prev.map((u) => (u.id === actualizado.id ? actualizado : u)));
      modalDesactivar.cerrar();
    } catch (err) {
      mostrarToast(err.message || "No se pudo completar la acción.", { tipo: "error" });
    }
  }

  const usuariosFiltrados = usuarios;

  return (
    <AppShell
      title="Administración"
      topbarExtra={
        <button className="btn-primary" onClick={abrirNuevo} type="button">
          <IconPlus width={15} height={15} />
          Nuevo usuario
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
        <Loading texto="Cargando usuarios..." />
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
                <button className="btn-outline-sm" type="button" onClick={() => modalReset.abrir(u)}>
                  Restablecer contraseña
                </button>
                <button className="btn-outline-sm" type="button" onClick={() => abrirEditar(u)}>Editar</button>
                <button
                  className="icon-btn"
                  type="button"
                  title={u.activo ? "Desactivar acceso" : "Reactivar acceso"}
                  onClick={() => modalDesactivar.abrir(u)}
                >
                  <IconTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== Modal: Nuevo usuario ===== */}
      <Modal open={modalNuevo.abierto} title="Nuevo usuario" subtitle="El usuario recibirá una contraseña temporal en su correo." onClose={modalNuevo.cerrar}>
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
          {errorUsuario && <p className="field-error">{errorUsuario}</p>}
          <ModalActions onCancel={modalNuevo.cerrar}>
            <button className="btn-primary" type="submit">Crear usuario</button>
          </ModalActions>
        </form>
      </Modal>

      {/* ===== Modal: Editar usuario ===== */}
      <Modal open={modalEditar.abierto} title="Editar usuario" subtitle={modalEditar.dato ? modalEditar.dato.nombre : ""} onClose={modalEditar.cerrar}>
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
          {errorUsuario && <p className="field-error">{errorUsuario}</p>}
          <ModalActions onCancel={modalEditar.cerrar}>
            <button className="btn-primary" type="submit">Guardar cambios</button>
          </ModalActions>
        </form>
      </Modal>

      {/* ===== Modal: Restablecer contraseña ===== */}
      <Modal
        open={modalReset.abierto}
        title="Restablecer contraseña"
        subtitle={modalReset.dato ? `Se generará una contraseña temporal para ${modalReset.dato.nombre}.` : ""}
        onClose={modalReset.cerrar}
      >
        <p className="usuario-modal-texto">
          {modalReset.dato?.nombre} tendrá que cambiarla la próxima vez que inicie sesión.
        </p>
        <ModalActions onCancel={modalReset.cerrar}>
          <button className="btn-primary" type="button" onClick={handleConfirmarReset}>Generar contraseña temporal</button>
        </ModalActions>
      </Modal>

      {/* ===== Modal: Desactivar / reactivar acceso ===== */}
      <Modal
        open={modalDesactivar.abierto}
        title={modalDesactivar.dato?.activo ? "Desactivar acceso" : "Reactivar acceso"}
        subtitle={modalDesactivar.dato ? modalDesactivar.dato.nombre : ""}
        onClose={modalDesactivar.cerrar}
      >
        <p className="usuario-modal-texto">
          {modalDesactivar.dato?.activo
            ? "Esta persona ya no podrá iniciar sesión en el sistema, pero su historial se mantiene intacto."
            : "Esta persona podrá volver a iniciar sesión normalmente."}
        </p>
        <ModalActions onCancel={modalDesactivar.cerrar}>
          <button className={modalDesactivar.dato?.activo ? "btn-danger" : "btn-primary"} type="button" onClick={handleConfirmarDesactivar}>
            {modalDesactivar.dato?.activo ? "Desactivar acceso" : "Reactivar acceso"}
          </button>
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
