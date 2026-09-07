import { useState } from "react";
import { AppShell } from "../components/layout/AppShell";
import { Modal, ModalActions } from "../components/shared/Modal";
import { IconPlus, IconTrash } from "../components/icons/Icons";
import * as usuariosService from "../services/usuariosService";
import { useDebounce } from "../hooks/useDebounce";
import { useAsyncList } from "../hooks/useAsyncList";
import { useModal } from "../hooks/useModal";
import Loading from "../components/shared/Loading";
import EstadoVacio from "../components/shared/EstadoVacio";
import EstadoError from "../components/shared/EstadoError";
import "./Administracion.css";

const ROL_LABEL = {
  ADMINISTRADOR: "Administrador",
  SUPERVISOR: "Supervisor",
  USUARIO: "Usuario",
};

function iniciales(nombre) {
  return nombre.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function Administracion() {
  const [busqueda, setBusqueda] = useState("");
  const busquedaDebounced = useDebounce(busqueda, 400);
  const [filtroRol, setFiltroRol] = useState("");

  const modalNuevo = useModal();
  const modalEditar = useModal(); // dato = usuario seleccionado
  const modalReset = useModal(); // dato = usuario seleccionado
  const modalDesactivar = useModal(); // dato = usuario seleccionado

  const [fUsuario, setFUsuario] = useState({
    nombre: "", correo: "", rol: "USUARIO", empresas: ["corevex"],
  });

  const [fUsuarioEditar, setFUsuarioEditar] = useState({
    nombre: "", correo: "", rol: "USUARIO", empresas: ["corevex"],
  });

  // TODO backend: cuando exista paginación (punto 1.16), pasar
  // { page, pageSize } acá y guardar el total para el paginador.
  const {
    data: usuarios,
    setData: setUsuarios,
    loading: cargando,
    error,
    reload,
  } = useAsyncList(
    () => usuariosService.listarUsuarios({ rol: filtroRol, q: busquedaDebounced }),
    [filtroRol, busquedaDebounced]
  );

  function abrirNuevo() {
    setFUsuario({ nombre: "", correo: "", rol: "USUARIO", empresas: ["corevex"] });
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

  function abrirEditar(u) {
    setFUsuarioEditar({ nombre: u.nombre, correo: u.correo, rol: u.rol, empresas: u.empresas });
    modalEditar.abrir(u);
  }

  async function handleGuardarUsuario(e) {
    e.preventDefault();
    const nuevo = await usuariosService.crearUsuario(fUsuario);
    setUsuarios((prev) => [nuevo, ...prev]);
    modalNuevo.cerrar();
  }

  async function handleGuardarEdicion(e) {
    e.preventDefault();
    const actualizado = await usuariosService.actualizarUsuario(modalEditar.dato.id, fUsuarioEditar);
    setUsuarios((prev) => prev.map((u) => (u.id === actualizado.id ? actualizado : u)));
    modalEditar.cerrar();
  }

  async function handleConfirmarReset() {
    await usuariosService.resetearPassword(modalReset.dato.id);
    modalReset.cerrar();
  }

  async function handleConfirmarDesactivar() {
    const actualizado = await usuariosService.cambiarEstadoUsuario(modalDesactivar.dato.id, !modalDesactivar.dato.activo);
    setUsuarios((prev) => prev.map((u) => (u.id === actualizado.id ? actualizado : u)));
    modalDesactivar.cerrar();
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
          <input placeholder="Buscar nombre o correo..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <select value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)}>
          <option value="">Todos los roles</option>
          <option value="ADMINISTRADOR">Administrador</option>
          <option value="SUPERVISOR">Supervisor</option>
          <option value="USUARIO">Usuario</option>
        </select>
      </div>

      {cargando ? (
        <Loading texto="Cargando usuarios..." />
      ) : error ? (
        <EstadoError error={error} onReintentar={reload} />
      ) : usuariosFiltrados.length === 0 ? (
        <EstadoVacio
          titulo={busqueda || filtroRol ? "No hay usuarios que coincidan con el filtro" : "No hay usuarios registrados todavía"}
          descripcion={busqueda || filtroRol ? "Prueba ajustando los filtros." : undefined}
          accionLabel={busqueda || filtroRol ? undefined : "Nuevo usuario"}
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
                <div className="usuario-card-correo">{u.correo}</div>
              </div>
              <span className={`rol-badge rol-${u.rol.toLowerCase()}`}>
                {ROL_LABEL[u.rol]}
              </span>
            </div>

            <div className="usuario-card-body">
              <span className="usuario-card-label">Acceso a</span>
              <div className="usuario-card-empresas">
                {u.empresas.map((e) => (
                  <span key={e} className={`co-badge ${e}`}>{e === "corevex" ? "Corevex" : "Electro"}</span>
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
            <label>Nombre completo</label>
            <input required value={fUsuario.nombre} onChange={(e) => setFUsuario({ ...fUsuario, nombre: e.target.value })} placeholder="Ej. Milagros Ríos" />
          </div>
          <div className="form-field">
            <label>Correo</label>
            <input required type="email" value={fUsuario.correo} onChange={(e) => setFUsuario({ ...fUsuario, correo: e.target.value })} placeholder="nombre@corevex.pe" />
          </div>
          <div className="form-field">
            <label>Rol</label>
            <div className="rol-choice">
              <label className={fUsuario.rol === "USUARIO" ? "sel" : ""}>
                <input type="radio" name="rol" checked={fUsuario.rol === "USUARIO"} onChange={() => setFUsuario({ ...fUsuario, rol: "USUARIO" })} />
                <div>
                  <strong>Usuario</strong>
                  <span>Acceso solo a Dashboard y Operaciones</span>
                </div>
              </label>
              <label className={fUsuario.rol === "SUPERVISOR" ? "sel" : ""}>
                <input type="radio" name="rol" checked={fUsuario.rol === "SUPERVISOR"} onChange={() => setFUsuario({ ...fUsuario, rol: "SUPERVISOR" })} />
                <div>
                  <strong>Supervisor</strong>
                  <span>Además accede a RRHH</span>
                </div>
              </label>
              <label className={fUsuario.rol === "ADMINISTRADOR" ? "sel" : ""}>
                <input type="radio" name="rol" checked={fUsuario.rol === "ADMINISTRADOR"} onChange={() => setFUsuario({ ...fUsuario, rol: "ADMINISTRADOR" })} />
                <div>
                  <strong>Administrador</strong>
                  <span>Acceso completo — pide código de verificación (MFA)</span>
                </div>
              </label>
            </div>
          </div>
          <div className="form-field">
            <label>Empresas con acceso</label>
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
          </div>
          <ModalActions onCancel={modalNuevo.cerrar}>
            <button className="btn-primary" type="submit">Crear usuario</button>
          </ModalActions>
        </form>
      </Modal>

      {/* ===== Modal: Editar usuario ===== */}
      <Modal open={modalEditar.abierto} title="Editar usuario" subtitle={modalEditar.dato ? modalEditar.dato.nombre : ""} onClose={modalEditar.cerrar}>
        <form onSubmit={handleGuardarEdicion}>
          <div className="form-field">
            <label>Nombre completo</label>
            <input required value={fUsuarioEditar.nombre} onChange={(e) => setFUsuarioEditar({ ...fUsuarioEditar, nombre: e.target.value })} placeholder="Ej. Milagros Ríos" />
          </div>
          <div className="form-field">
            <label>Correo</label>
            <input required type="email" value={fUsuarioEditar.correo} onChange={(e) => setFUsuarioEditar({ ...fUsuarioEditar, correo: e.target.value })} placeholder="nombre@corevex.pe" />
          </div>
          <div className="form-field">
            <label>Rol</label>
            <div className="rol-choice">
              <label className={fUsuarioEditar.rol === "USUARIO" ? "sel" : ""}>
                <input type="radio" name="rolEditar" checked={fUsuarioEditar.rol === "USUARIO"} onChange={() => setFUsuarioEditar({ ...fUsuarioEditar, rol: "USUARIO" })} />
                <div>
                  <strong>Usuario</strong>
                  <span>Acceso solo a Dashboard y Operaciones</span>
                </div>
              </label>
              <label className={fUsuarioEditar.rol === "SUPERVISOR" ? "sel" : ""}>
                <input type="radio" name="rolEditar" checked={fUsuarioEditar.rol === "SUPERVISOR"} onChange={() => setFUsuarioEditar({ ...fUsuarioEditar, rol: "SUPERVISOR" })} />
                <div>
                  <strong>Supervisor</strong>
                  <span>Además accede a RRHH</span>
                </div>
              </label>
              <label className={fUsuarioEditar.rol === "ADMINISTRADOR" ? "sel" : ""}>
                <input type="radio" name="rolEditar" checked={fUsuarioEditar.rol === "ADMINISTRADOR"} onChange={() => setFUsuarioEditar({ ...fUsuarioEditar, rol: "ADMINISTRADOR" })} />
                <div>
                  <strong>Administrador</strong>
                  <span>Acceso completo — pide código de verificación (MFA)</span>
                </div>
              </label>
            </div>
          </div>
          <div className="form-field">
            <label>Empresas con acceso</label>
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
          </div>
          <ModalActions onCancel={modalEditar.cerrar}>
            <button className="btn-primary" type="submit">Guardar cambios</button>
          </ModalActions>
        </form>
      </Modal>

      {/* ===== Modal: Restablecer contraseña ===== */}
      <Modal
        open={modalReset.abierto}
        title="Restablecer contraseña"
        subtitle={modalReset.dato ? `Se enviará una contraseña temporal al correo de ${modalReset.dato.nombre}.` : ""}
        onClose={modalReset.cerrar}
      >
        <p className="usuario-modal-texto">
          {modalReset.dato?.nombre} tendrá que cambiarla la próxima vez que inicie sesión.
        </p>
        <ModalActions onCancel={modalReset.cerrar}>
          <button className="btn-primary" type="button" onClick={handleConfirmarReset}>Enviar contraseña temporal</button>
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
    </AppShell>
  );
}
