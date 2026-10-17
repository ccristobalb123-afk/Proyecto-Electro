import { createElement, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import * as facturasService from "../services/facturasService";
import * as finanzasService from "../services/finanzasService";
import * as catalogoDetraccionService from "../services/catalogoDetraccionService";
import { subirArchivo } from "../services/uploadsService";
import { totalPagado, montoNetoAPagar } from "../services/facturasService";
import { useDebounce } from "./useDebounce";
import { useAsyncList } from "./useAsyncList";
import { useAccion } from "./useAccion";
import { useConfirm } from "../context/ConfirmContext";
import { useToast } from "../context/ToastContext";
import { soles, rucValido } from "../components/finanzas/finanzasUtils";
import DetalleEliminarGasto from "../components/finanzas/DetalleEliminarGasto";

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
  return {
    empresa: "corevex", categoria: categoriasGasto[0] || "", monto: "", fecha: "", proveedor: "", trabajador: "", descripcion: "",
    tipoComprobante: "", rucProveedor: "",
    // Solo para mostrar en el formulario: el archivo elegido o el que ya tiene.
    archivoNombre: "",
  };
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
  const acciones = useAccion();
  const [errorFormulario, setErrorFormulario] = useState("");
  // ?tab=…&q=<cliente> — enlace directo desde un aviso de vencimiento.
  const [searchParams] = useSearchParams();
  const tabInicial = searchParams.get("tab");
  const [tab, setTab] = useState(["facturasPagar", "gastos"].includes(tabInicial) ? tabInicial : "facturas"); // "facturas" | "facturasPagar" | "gastos"
  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroTipo, setFiltroTipo] = useState(""); // Gastos: "" | "boleta" | "factura" | "sin"
  const [busqueda, setBusqueda] = useState(searchParams.get("q") || "");
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
    await acciones.ejecutar("categoria", async () => {
      try {
        const nombreCreado = await finanzasService.agregarCategoriaGasto(nombreNuevaCategoriaGasto);
        setCategoriasGasto((prev) => [...prev, nombreCreado]);
        setFGasto((f) => ({ ...f, categoria: nombreCreado }));
        setNuevaCategoriaGasto(false);
        setNombreNuevaCategoriaGasto("");
        setErrorCategoriaGasto("");
        mostrarToast(`Categoría "${nombreCreado}" creada`, { tipo: "success" });
      } catch (err) {
        setErrorCategoriaGasto(err.message || "No se pudo crear la categoría.");
      }
    });
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
    const params = { empresa: filtroEmpresa, estado: filtroEstado, tipo: filtroTipo, q: busquedaDebounced, signal };
    if (tab === "facturas") return facturasService.listarFacturas(params);
    if (tab === "facturasPagar") return facturasService.listarFacturasPorPagar(params);
    return finanzasService.listarGastos(params);
  }, [tab, filtroEmpresa, filtroEstado, filtroTipo, busquedaDebounced]);

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
  // Documento del gasto elegido en el formulario (se sube al guardar).
  const [archivoGasto, setArchivoGasto] = useState(null);
  // Lo que le faltaba al gasto que se está editando (gastos antiguos).
  const [faltantesGasto, setFaltantesGasto] = useState([]);

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
    setFiltroTipo("");
    setBusqueda("");
    setListaActual([]);
  }

  function abrirNuevo() {
    setFFactura(FORM_FACTURA_VACIO);
    setFFacturaPagar(FORM_FACTURA_PAGAR_VACIO);
    setFGasto(formGastoVacio(categoriasGasto));
    setArchivoGasto(null);
    setFaltantesGasto([]);
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

  // Anular no borra la factura: la marca como anulada y queda visible
  // (tachada) para el historial contable. Con pagos registrados no se
  // puede — se explica antes de pedir confirmación, no con un error.
  async function handleAnularFactura(f) {
    if (totalPagado(f.pagos) > 0) {
      return alertar({
        titulo: "No se puede anular esta factura",
        mensaje: `La factura ${f.serie}-${f.numero} ya tiene pagos registrados por ${soles(totalPagado(f.pagos))}. Para revertirla se necesita emitir una nota de crédito.`,
      });
    }
    const ok = await confirmar({
      titulo: `¿Anular la factura ${f.serie}-${f.numero}?`,
      mensaje: `La factura de ${f.cliente} por ${soles(f.montoTotal)} quedará anulada: seguirá visible en la lista, pero ya no se le podrán registrar pagos. Esta acción no se puede deshacer.`,
      tipo: "peligro",
      textoConfirmar: "Anular factura",
      textoCargando: "Anulando…",
      accion: async () => {
        const actualizada = await facturasService.anularFactura(f.id);
        setListaActual((prev) => prev.map((x) => (x.id === actualizada.id ? actualizada : x)));
      },
    });
    if (ok) mostrarToast("Factura anulada", { tipo: "success" });
  }


  async function handleAnularFacturaPagar(f) {
    if (totalPagado(f.pagos) > 0) {
      return alertar({
        titulo: "No se puede anular esta factura por pagar",
        mensaje: `Ya tiene pagos registrados a ${f.proveedor} por ${soles(totalPagado(f.pagos))}. Para revertirla se necesita una nota de crédito del proveedor.`,
      });
    }
    const ok = await confirmar({
      titulo: `¿Anular la factura por pagar a ${f.proveedor}?`,
      mensaje: `La factura por ${soles(f.montoTotal)} quedará anulada: seguirá visible en la lista, pero ya no se le podrán registrar pagos. Esta acción no se puede deshacer.`,
      tipo: "peligro",
      textoConfirmar: "Anular factura",
      textoCargando: "Anulando…",
      accion: async () => {
        const actualizada = await facturasService.anularFacturaPorPagar(f.id);
        setListaActual((prev) => prev.map((x) => (x.id === actualizada.id ? actualizada : x)));
      },
    });
    if (ok) mostrarToast("Factura por pagar anulada", { tipo: "success" });
  }


  async function handleGuardarFactura(e) {
    e.preventDefault();
    setErrorFormulario("");
    await acciones.ejecutar("modal", async () => {
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
        mostrarToast(idEditando ? "Factura actualizada" : "Factura registrada", { tipo: "success" });
      } catch (err) {
        setErrorFormulario(err.message || "No se pudo guardar la factura.");
      }
    });
  }


  async function handleGuardarFacturaPagar(e) {
    e.preventDefault();
    setErrorFormulario("");
    await acciones.ejecutar("modal", async () => {
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
        mostrarToast(idEditando ? "Factura por pagar actualizada" : "Factura por pagar registrada", { tipo: "success" });
      } catch (err) {
        setErrorFormulario(err.message || "No se pudo guardar la factura por pagar.");
      }
    });
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
      tipoComprobante: g.tipoComprobante || "",
      rucProveedor: g.rucProveedor || "",
      archivoNombre: g.archivo ? g.archivoNombre || "Comprobante adjunto" : "",
    });
    setArchivoGasto(null);
    setFaltantesGasto(g.faltantes || []);
    setIdEditando(g.id);
    setErrorFormulario("");
    setModalNuevo(true);
  }

  function elegirArchivoGasto(archivo) {
    setArchivoGasto(archivo);
    setFGasto((f) => ({ ...f, archivoNombre: archivo.name }));
    setErrorFormulario("");
  }

  // Mismas reglas que el backend, revisadas antes de subir nada.
  function errorGasto() {
    if (!fGasto.tipoComprobante) return "Elige el tipo de comprobante: Boleta o Factura.";
    if (fGasto.tipoComprobante === "factura") {
      if (!fGasto.rucProveedor) return "Ingresa el RUC del proveedor: es obligatorio en una factura.";
      if (!rucValido(fGasto.rucProveedor)) return "El RUC del proveedor no es válido: debe tener 11 dígitos y empezar con 10, 15, 16, 17 o 20. Revisa que esté bien escrito.";
    }
    if (!archivoGasto && !fGasto.archivoNombre) return "Adjunta la foto o PDF del comprobante: es obligatorio.";
    return "";
  }

  async function handleGuardarGasto(e) {
    e.preventDefault();
    const error = errorGasto();
    setErrorFormulario(error);
    if (error) return;
    await acciones.ejecutar("modal", async ({ subida, etapa }) => {
      try {
        // archivoNombre del formulario es solo para mostrar.
        const { archivoNombre: _soloVista, ...base } = fGasto;
        let datos = base;
        if (archivoGasto) {
          const { url, nombre } = await subirArchivo(archivoGasto, subida);
          etapa(idEditando ? "Guardando…" : "Registrando…");
          datos = { ...base, archivoNombre: nombre, archivoUrl: url };
        }
        if (idEditando) {
          const actualizado = await finanzasService.actualizarGasto(idEditando, datos);
          setListaActual((prev) => prev.map((g) => (g.id === actualizado.id ? actualizado : g)));
        } else {
          const nuevo = await finanzasService.crearGasto(datos);
          setListaActual((prev) => [nuevo, ...prev]);
        }
        setArchivoGasto(null);
        cerrarModalNuevo();
        mostrarToast(idEditando ? "Gasto actualizado" : "Gasto registrado", { tipo: "success" });
      } catch (err) {
        setErrorFormulario(err.message || "No se pudo guardar el gasto.");
      }
    });
  }


  async function handleEliminarGasto(g) {
    const ok = await confirmar({
      titulo: "¿Eliminar este gasto?",
      mensaje: createElement(DetalleEliminarGasto, { gasto: g }),
      tipo: "peligro",
      textoConfirmar: "Eliminar gasto",
      textoCargando: "Eliminando…",
      accion: async () => {
        await finanzasService.eliminarGasto(g.id);
        setListaActual((prev) => prev.filter((x) => x.id !== g.id));
      },
    });
    if (ok) mostrarToast("Gasto eliminado", { tipo: "success" });
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
    await acciones.ejecutar("pago", async () => {
      try {
        if (modalPago.tipo === "factura") {
          const actualizada = await facturasService.registrarPagoFactura(modalPago.doc.id, monto);
          setListaActual((prev) => prev.map((f) => (f.id === actualizada.id ? actualizada : f)));
        } else {
          const actualizada = await facturasService.registrarPagoFacturaPorPagar(modalPago.doc.id, monto);
          setListaActual((prev) => prev.map((f) => (f.id === actualizada.id ? actualizada : f)));
        }
        setModalPago(null);
        mostrarToast(`Pago de ${soles(monto)} registrado`, { tipo: "success" });
      } catch (err) {
        setErrorPago(err.message || "No se pudo registrar el pago.");
      }
    });
  }

  // Clave por tarjeta: cada una muestra su propio "Subiendo… 40%".
  async function marcarComprobanteSubido(id, archivo) {
    await acciones.ejecutar(`comprobante-${id}`, async ({ subida, etapa }) => {
      try {
        const { url, nombre } = await subirArchivo(archivo, subida);
        etapa("Guardando…");
        let actualizado;
        if (tab === "facturas") {
          actualizado = await facturasService.adjuntarComprobanteFactura(id, nombre, url);
        } else if (tab === "facturasPagar") {
          actualizado = await facturasService.adjuntarComprobanteFacturaPorPagar(id, nombre, url);
        } else {
          actualizado = await finanzasService.adjuntarComprobanteGasto(id, nombre, url);
        }
        setListaActual((prev) => prev.map((x) => (x.id === actualizado.id ? actualizado : x)));
        mostrarToast("Comprobante adjuntado", { tipo: "success" });
      } catch (err) {
        mostrarToast(err.message || "No se pudo subir el comprobante.", { tipo: "error" });
      }
    });
  }

  const tituloNuevo = { facturas: "Nueva factura", facturasPagar: "Nueva factura por pagar", gastos: "Nuevo gasto" }[tab];

  return {
    tab, cambiarTab, tituloNuevo,
    filtroEmpresa, setFiltroEmpresa,
    filtroEstado, setFiltroEstado,
    filtroTipo, setFiltroTipo,
    busqueda, setBusqueda,
    cargando, error, reload,
    facturas, facturasPagar, gastos,
    modalNuevo, idEditando, abrirNuevo, cerrarModalNuevo,
    guardando: acciones.ocupado("modal"),
    textoGuardando: acciones.texto("modal", idEditando ? "Guardando…" : "Registrando…"),
    registrandoPago: acciones.ocupado("pago"),
    creandoCategoria: acciones.ocupado("categoria"),
    estadoComprobante: (id) => (acciones.ocupado(`comprobante-${id}`) ? acciones.texto(`comprobante-${id}`, "Subiendo archivo…") : null),
    fFactura, setFFactura, abrirEditarFactura, handleGuardarFactura, handleAnularFactura, errorFormulario,
    fFacturaPagar, setFFacturaPagar, abrirEditarFacturaPagar, handleGuardarFacturaPagar, handleAnularFacturaPagar,
    fGasto, setFGasto, archivoGasto, elegirArchivoGasto, faltantesGasto, abrirEditarGasto, handleGuardarGasto, handleEliminarGasto, categoriasGasto,
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
