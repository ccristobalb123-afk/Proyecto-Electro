import { useEffect, useState } from "react";
import * as facturasService from "../services/facturasService";
import * as finanzasService from "../services/finanzasService";
import * as catalogoDetraccionService from "../services/catalogoDetraccionService";
import { subirArchivo } from "../services/uploadsService";
import { totalPagado, montoNetoAPagar } from "../services/facturasService";
import { useDebounce } from "./useDebounce";
import { useAsyncList } from "./useAsyncList";
import { useConfirm } from "../context/ConfirmContext";
import { useToast } from "../context/ToastContext";
import { soles } from "../components/finanzas/finanzasUtils";

const FORM_FACTURA_VACIO = {
  empresa: "corevex", cliente: "", serie: "", numero: "", montoBase: "", igvIncluido: true,
  fechaEmision: "", fechaVencimiento: "",
  catalogoDetraccionId: null, detraccionMedioPago: "", detraccionCuentaBn: "",
  diasAviso: 7,
};

const FORM_FACTURA_PAGAR_VACIO = {
  empresa: "corevex", proveedor: "", motivo: "", montoBase: "", igvIncluido: true, fechaEmision: "", fechaVencimiento: "",
  catalogoDetraccionId: null, detraccionMedioPago: "", detraccionCuentaBn: "",
};

function formGastoVacio(categoriasGasto) {
  return { empresa: "corevex", categoria: categoriasGasto[0] || "", monto: "", fecha: "", proveedor: "", trabajador: "", descripcion: "" };
}

const IGV = 0.18;

// Si el monto que se escribió YA incluye IGV, se manda tal cual. Si no,
// el sistema le agrega el 18% automáticamente antes de guardar — el
// backend solo conoce el monto final, no de dónde salió.
function calcularMontoTotal(montoBase, igvIncluido) {
  const base = Number(montoBase) || 0;
  return igvIncluido ? base : Number((base * (1 + IGV)).toFixed(2));
}

// Toda la lógica de negocio de la página Finanzas — antes vivía dentro
// de Finanzas.jsx mezclada con el JSX. Ahora la página solo arma la
// vista con lo que este hook le devuelve; acá vive el estado, la carga
// de datos y los handlers.
export function useFinanzasManager() {
  const { confirmar, alertar } = useConfirm();
  const { mostrarToast } = useToast();
  const [errorFormulario, setErrorFormulario] = useState("");
  const [tab, setTab] = useState("facturas"); // "facturas" | "facturasPagar" | "gastos"
  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const busquedaDebounced = useDebounce(busqueda, 400);

  // Categorías de gasto — antes era un array fijo importado
  // (CATEGORIAS_GASTO), ahora vive en la base de datos.
  const [categoriasGasto, setCategoriasGasto] = useState([]);
  useEffect(() => {
    finanzasService.listarCategoriasGasto().then(setCategoriasGasto);
  }, []);

  // Catálogo de detracción (SUNAT) — se carga una sola vez, igual que
  // categoriasGasto, y se le pasa a ambos modales (Factura y Factura
  // por pagar comparten el mismo catálogo).
  const [catalogoDetraccion, setCatalogoDetraccion] = useState([]);
  useEffect(() => {
    catalogoDetraccionService.listarCatalogoDetraccion().then(setCatalogoDetraccion);
  }, []);

  // "+ Nueva categoría..." dentro del modal de Nuevo gasto — a
  // diferencia de Equipos (donde la categoría se crea junto con el
  // equipo en un solo submit), acá se crea de inmediato: es solo un
  // nombre, sin campos personalizados que definir.
  const [nuevaCategoriaGasto, setNuevaCategoriaGasto] = useState(false);
  const [nombreNuevaCategoriaGasto, setNombreNuevaCategoriaGasto] = useState("");
  const [errorCategoriaGasto, setErrorCategoriaGasto] = useState("");

  async function handleAgregarCategoriaGasto() {
    if (!nombreNuevaCategoriaGasto.trim()) {
      setErrorCategoriaGasto("Ponle un nombre a la categoría.");
      return;
    }
    try {
      const nombreCreado = await finanzasService.agregarCategoriaGasto(nombreNuevaCategoriaGasto);
      setCategoriasGasto((prev) => [...prev, nombreCreado]);
      setFGasto((f) => ({ ...f, categoria: nombreCreado }));
      setNuevaCategoriaGasto(false);
      setNombreNuevaCategoriaGasto("");
      setErrorCategoriaGasto("");
    } catch (err) {
      setErrorCategoriaGasto(err.message);
    }
  }

  // Para "Gestionar categorías" — editar el nombre de una categoría
  // existente, o borrarla si ningún gasto la está usando.
  const [modalCategoriasGasto, setModalCategoriasGasto] = useState(false);

  async function handleRenombrarCategoriaGasto(nombreActual, nombreNuevo) {
    const nombreFinal = await finanzasService.actualizarCategoriaGasto(nombreActual, nombreNuevo);
    setCategoriasGasto((prev) => prev.map((c) => (c === nombreActual ? nombreFinal : c)));
    if (fGasto.categoria === nombreActual) setFGasto((f) => ({ ...f, categoria: nombreFinal }));
  }

  async function handleEliminarCategoriaGasto(nombre) {
    await finanzasService.eliminarCategoriaGasto(nombre);
    setCategoriasGasto((prev) => prev.filter((c) => c !== nombre));
  }

  // Una sola lista "activa" según la pestaña — más simple que mantener
  // 3 estados de carga/error separados para 3 listas que nunca se
  // muestran al mismo tiempo.
  const {
    data: listaActual,
    setData: setListaActual,
    loading: cargando,
    error,
    reload,
  } = useAsyncList((signal) => {
    const params = { empresa: filtroEmpresa, estado: filtroEstado, q: busquedaDebounced, signal };
    if (tab === "facturas") return facturasService.listarFacturas(params);
    if (tab === "facturasPagar") return facturasService.listarFacturasPorPagar(params);
    return finanzasService.listarGastos(params);
  }, [tab, filtroEmpresa, filtroEstado, busquedaDebounced]);

  const facturas = tab === "facturas" ? listaActual : [];
  const facturasPagar = tab === "facturasPagar" ? listaActual : [];
  const gastos = tab === "gastos" ? listaActual : [];

  const [modalNuevo, setModalNuevo] = useState(false);
  const [idEditando, setIdEditando] = useState(null); // null = creando, id = editando ese registro
  const [modalPago, setModalPago] = useState(null); // { tipo: "factura"|"facturaPagar", doc }
  const [montoPago, setMontoPago] = useState("");
  const [errorPago, setErrorPago] = useState("");

  const [fFactura, setFFactura] = useState(FORM_FACTURA_VACIO);
  const [fFacturaPagar, setFFacturaPagar] = useState(FORM_FACTURA_PAGAR_VACIO);
  const [fGasto, setFGasto] = useState(formGastoVacio([]));

  // Al cambiar de pestaña limpiamos la lista de inmediato: las 3 pestañas
  // comparten `listaActual` pero tienen formas de dato distintas (facturas
  // usan `montoTotal`, gastos usan `monto`), y la recarga es asíncrona.
  // Sin este reset, el primer render tras el cambio de pestaña sigue
  // mostrando los datos de la pestaña anterior con la forma equivocada,
  // lo que rompe componentes como GastosGrid (soles(g.monto) sobre una
  // factura, que no tiene `monto`, sino `montoTotal`).
  function cambiarTab(nuevoTab) {
    // Misma pestaña: no hay nada que limpiar ni que recargar. Sin esta guarda,
    // el clic en la pestaña activa vaciaba la lista (setListaActual([])) y, al no
    // cambiar ninguna dependencia de useAsyncList, nunca se volvía a pedir.
    if (nuevoTab === tab) return;
    setTab(nuevoTab);
    setFiltroEstado("");
    setBusqueda("");
    setListaActual([]);
  }

  function abrirNuevo() {
    setFFactura(FORM_FACTURA_VACIO);
    setFFacturaPagar(FORM_FACTURA_PAGAR_VACIO);
    setFGasto(formGastoVacio(categoriasGasto));
    setIdEditando(null);
    setErrorFormulario("");
    setModalNuevo(true);
  }

  function cerrarModalNuevo() {
    setModalNuevo(false);
    setIdEditando(null);
  }

  function abrirEditarFactura(f) {
    setFFactura({
      empresa: f.empresa,
      cliente: f.cliente,
      serie: f.serie,
      numero: f.numero,
      montoBase: String(f.montoTotal),
      igvIncluido: true,
      fechaEmision: f.fechaEmision,
      fechaVencimiento: f.fechaVencimiento,
      catalogoDetraccionId: f.catalogoDetraccion?.id ?? null,
      detraccionMedioPago: f.detraccionMedioPago || "",
      detraccionCuentaBn: f.detraccionCuentaBn || "",
      diasAviso: f.diasAviso ?? 7,
    });
    setIdEditando(f.id);
    setErrorFormulario("");
    setModalNuevo(true);
  }

  function abrirEditarFacturaPagar(f) {
    setFFacturaPagar({
      empresa: f.empresa,
      proveedor: f.proveedor,
      motivo: f.motivo,
      montoBase: String(f.montoTotal),
      igvIncluido: true,
      fechaEmision: f.fechaEmision,
      fechaVencimiento: f.fechaVencimiento,
      catalogoDetraccionId: f.catalogoDetraccion?.id ?? null,
      detraccionMedioPago: f.detraccionMedioPago || "",
      detraccionCuentaBn: f.detraccionCuentaBn || "",
    });
    setIdEditando(f.id);
    setErrorFormulario("");
    setModalNuevo(true);
  }

  async function handleAnularFactura(f) {
    const seguro = await confirmar(
      `¿Anular la factura ${f.serie}-${f.numero} de ${f.cliente}? Esta acción no se puede deshacer.`,
      { tipo: "peligro" }
    );
    if (!seguro) return;
    try {
      const actualizada = await facturasService.anularFactura(f.id);
      setListaActual((prev) => prev.map((x) => (x.id === actualizada.id ? actualizada : x)));
    } catch (err) {
      alertar(err.message || "No se pudo anular la factura.");
    }
  }

  async function handleAnularFacturaPagar(f) {
    const seguro = await confirmar(
      `¿Anular esta factura por pagar a ${f.proveedor}? Esta acción no se puede deshacer.`,
      { tipo: "peligro" }
    );
    if (!seguro) return;
    try {
      const actualizada = await facturasService.anularFacturaPorPagar(f.id);
      setListaActual((prev) => prev.map((x) => (x.id === actualizada.id ? actualizada : x)));
    } catch (err) {
      alertar(err.message || "No se pudo anular la factura por pagar.");
    }
  }

  async function handleGuardarFactura(e) {
    e.preventDefault();
    setErrorFormulario("");
    try {
      const datos = { ...fFactura, montoTotal: calcularMontoTotal(fFactura.montoBase, fFactura.igvIncluido) };
      if (idEditando) {
        const actualizada = await facturasService.actualizarFactura(idEditando, datos);
        setListaActual((prev) => prev.map((f) => (f.id === actualizada.id ? actualizada : f)));
      } else {
        const nueva = await facturasService.crearFactura(datos);
        setListaActual((prev) => [nueva, ...prev]);
      }
      cerrarModalNuevo();
    } catch (err) {
      setErrorFormulario(err.message || "No se pudo guardar la factura.");
    }
  }

  async function handleGuardarFacturaPagar(e) {
    e.preventDefault();
    setErrorFormulario("");
    try {
      const datos = { ...fFacturaPagar, montoTotal: calcularMontoTotal(fFacturaPagar.montoBase, fFacturaPagar.igvIncluido) };
      if (idEditando) {
        const actualizada = await facturasService.actualizarFacturaPorPagar(idEditando, datos);
        setListaActual((prev) => prev.map((f) => (f.id === actualizada.id ? actualizada : f)));
      } else {
        const nueva = await facturasService.crearFacturaPorPagar(datos);
        setListaActual((prev) => [nueva, ...prev]);
      }
      cerrarModalNuevo();
    } catch (err) {
      setErrorFormulario(err.message || "No se pudo guardar la factura por pagar.");
    }
  }

  function abrirEditarGasto(g) {
    setFGasto({
      empresa: g.empresa,
      categoria: g.categoria,
      monto: String(g.monto),
      fecha: g.fecha,
      proveedor: g.proveedor,
      trabajador: g.trabajador,
      descripcion: g.descripcion,
    });
    setIdEditando(g.id);
    setErrorFormulario("");
    setModalNuevo(true);
  }

  async function handleGuardarGasto(e) {
    e.preventDefault();
    setErrorFormulario("");
    try {
      if (idEditando) {
        const actualizado = await finanzasService.actualizarGasto(idEditando, fGasto);
        setListaActual((prev) => prev.map((g) => (g.id === actualizado.id ? actualizado : g)));
      } else {
        const nuevo = await finanzasService.crearGasto(fGasto);
        setListaActual((prev) => [nuevo, ...prev]);
      }
      cerrarModalNuevo();
    } catch (err) {
      setErrorFormulario(err.message || "No se pudo guardar el gasto.");
    }
  }

  async function handleEliminarGasto(g) {
    const seguro = await confirmar(`¿Eliminar este gasto de ${g.categoria}? Esta acción no se puede deshacer.`, { tipo: "peligro" });
    if (!seguro) return;
    try {
      await finanzasService.eliminarGasto(g.id);
      setListaActual((prev) => prev.filter((x) => x.id !== g.id));
    } catch (err) {
      alertar(err.message || "No se pudo eliminar el gasto.");
    }
  }

  function abrirRegistrarPago(tipo, doc) {
    setMontoPago("");
    setErrorPago("");
    setModalPago({ tipo, doc });
  }

  function cambiarMontoPago(v) {
    setMontoPago(v);
    setErrorPago("");
  }

  async function handleConfirmarPago() {
    const monto = Number(montoPago);
    const yaPagado = totalPagado(modalPago.doc.pagos);
    const saldo = montoNetoAPagar(modalPago.doc) - yaPagado;
    if (!monto || monto <= 0) {
      setErrorPago("Ingresa un monto válido.");
      return;
    }
    if (monto > saldo) {
      setErrorPago(`El pago no puede ser mayor al saldo pendiente (${soles(saldo)}).`);
      return;
    }
    try {
      if (modalPago.tipo === "factura") {
        const actualizada = await facturasService.registrarPagoFactura(modalPago.doc.id, monto);
        setListaActual((prev) => prev.map((f) => (f.id === actualizada.id ? actualizada : f)));
      } else {
        const actualizada = await facturasService.registrarPagoFacturaPorPagar(modalPago.doc.id, monto);
        setListaActual((prev) => prev.map((f) => (f.id === actualizada.id ? actualizada : f)));
      }
      setModalPago(null);
    } catch (err) {
      setErrorPago(err.message || "No se pudo registrar el pago.");
    }
  }

  async function marcarComprobanteSubido(id, archivo) {
    try {
      const { url, nombre } = await subirArchivo(archivo);
      let actualizado;
      if (tab === "facturas") {
        actualizado = await facturasService.adjuntarComprobanteFactura(id, nombre, url);
      } else if (tab === "facturasPagar") {
        actualizado = await facturasService.adjuntarComprobanteFacturaPorPagar(id, nombre, url);
      } else {
        actualizado = await finanzasService.adjuntarComprobanteGasto(id, nombre, url);
      }
      setListaActual((prev) => prev.map((x) => (x.id === actualizado.id ? actualizado : x)));
    } catch (err) {
      mostrarToast(err.message || "No se pudo subir el comprobante.", { tipo: "error" });
    }
  }

  const tituloNuevo = { facturas: "Nueva factura", facturasPagar: "Nueva factura por pagar", gastos: "Nuevo gasto" }[tab];

  return {
    tab, cambiarTab, tituloNuevo,
    filtroEmpresa, setFiltroEmpresa,
    filtroEstado, setFiltroEstado,
    busqueda, setBusqueda,
    cargando, error, reload,
    facturas, facturasPagar, gastos,
    modalNuevo, idEditando, abrirNuevo, cerrarModalNuevo,
    fFactura, setFFactura, abrirEditarFactura, handleGuardarFactura, handleAnularFactura, errorFormulario,
    fFacturaPagar, setFFacturaPagar, abrirEditarFacturaPagar, handleGuardarFacturaPagar, handleAnularFacturaPagar,
    fGasto, setFGasto, abrirEditarGasto, handleGuardarGasto, handleEliminarGasto, categoriasGasto,
    catalogoDetraccion,
    nuevaCategoriaGasto, setNuevaCategoriaGasto,
    nombreNuevaCategoriaGasto, setNombreNuevaCategoriaGasto,
    errorCategoriaGasto, handleAgregarCategoriaGasto,
    modalCategoriasGasto, setModalCategoriasGasto, handleRenombrarCategoriaGasto, handleEliminarCategoriaGasto,
    modalPago, setModalPago, montoPago, cambiarMontoPago, errorPago,
    abrirRegistrarPago, handleConfirmarPago,
    marcarComprobanteSubido,
  };
}
