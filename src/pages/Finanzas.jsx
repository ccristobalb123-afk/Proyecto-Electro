import { useState } from "react";
import { AppShell } from "../components/layout/AppShell";
import { IconPlus } from "../components/icons/Icons";
import * as facturasService from "../services/facturasService";
import * as finanzasService from "../services/finanzasService";
import { CATEGORIAS_GASTO } from "../services/finanzasService";
import { totalPagado } from "../services/facturasService";
import { useDebounce } from "../hooks/useDebounce";
import { useAsyncList } from "../hooks/useAsyncList";
import { soles } from "../components/finanzas/finanzasUtils";
import FacturasGrid from "../components/finanzas/FacturasGrid";
import FacturasPorPagarGrid from "../components/finanzas/FacturasPorPagarGrid";
import GastosGrid from "../components/finanzas/GastosGrid";
import ModalNuevaFactura from "../components/finanzas/ModalNuevaFactura";
import ModalNuevaFacturaPagar from "../components/finanzas/ModalNuevaFacturaPagar";
import ModalNuevoGasto from "../components/finanzas/ModalNuevoGasto";
import ModalRegistrarPago from "../components/finanzas/ModalRegistrarPago";
import "./Finanzas.css";

export default function Finanzas() {
  const [tab, setTab] = useState("facturas"); // "facturas" | "facturasPagar" | "gastos"
  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const busquedaDebounced = useDebounce(busqueda, 400);

  // Una sola lista "activa" según la pestaña — más simple que mantener
  // 3 estados de carga/error separados para 3 listas que nunca se
  // muestran al mismo tiempo.
  const {
    data: listaActual,
    setData: setListaActual,
    loading: cargando,
    error,
    reload,
  } = useAsyncList(() => {
    const params = { empresa: filtroEmpresa, estado: filtroEstado, q: busquedaDebounced };
    if (tab === "facturas") return facturasService.listarFacturas(params);
    if (tab === "facturasPagar") return facturasService.listarFacturasPorPagar(params);
    return finanzasService.listarGastos(params);
  }, [tab, filtroEmpresa, filtroEstado, busquedaDebounced]);

  const facturas = tab === "facturas" ? listaActual : [];
  const facturasPagar = tab === "facturasPagar" ? listaActual : [];
  const gastos = tab === "gastos" ? listaActual : [];

  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalPago, setModalPago] = useState(null); // { tipo: "factura"|"facturaPagar", doc }
  const [montoPago, setMontoPago] = useState("");
  const [errorPago, setErrorPago] = useState("");

  const [fFactura, setFFactura] = useState({
    empresa: "corevex", cliente: "", serie: "", numero: "", montoTotal: "",
    fechaEmision: "", fechaVencimiento: "", aplicaDetraccion: false, diasAviso: 7,
  });
  const [fFacturaPagar, setFFacturaPagar] = useState({
    empresa: "corevex", proveedor: "", motivo: "", montoTotal: "", fechaEmision: "", fechaVencimiento: "",
  });
  const [fGasto, setFGasto] = useState({
    empresa: "corevex", categoria: CATEGORIAS_GASTO[0], monto: "", fecha: "", proveedor: "", trabajador: "", descripcion: "",
  });

  function abrirNuevo() {
    setFFactura({ empresa: "corevex", cliente: "", serie: "", numero: "", montoTotal: "", fechaEmision: "", fechaVencimiento: "", aplicaDetraccion: false, diasAviso: 7 });
    setFFacturaPagar({ empresa: "corevex", proveedor: "", motivo: "", montoTotal: "", fechaEmision: "", fechaVencimiento: "" });
    setFGasto({ empresa: "corevex", categoria: CATEGORIAS_GASTO[0], monto: "", fecha: "", proveedor: "", trabajador: "", descripcion: "" });
    setModalNuevo(true);
  }

  async function handleGuardarFactura(e) {
    e.preventDefault();
    const nueva = await facturasService.crearFactura(fFactura);
    setListaActual((prev) => [nueva, ...prev]);
    setModalNuevo(false);
  }

  async function handleGuardarFacturaPagar(e) {
    e.preventDefault();
    const nueva = await facturasService.crearFacturaPorPagar(fFacturaPagar);
    setListaActual((prev) => [nueva, ...prev]);
    setModalNuevo(false);
  }

  async function handleGuardarGasto(e) {
    e.preventDefault();
    const nuevo = await finanzasService.crearGasto(fGasto);
    setListaActual((prev) => [nuevo, ...prev]);
    setModalNuevo(false);
  }

  function abrirRegistrarPago(tipo, doc) {
    setMontoPago("");
    setErrorPago("");
    setModalPago({ tipo, doc });
  }

  async function handleConfirmarPago() {
    const monto = Number(montoPago);
    const yaPagado = totalPagado(modalPago.doc.pagos);
    const saldo = modalPago.doc.montoTotal - yaPagado;
    if (!monto || monto <= 0) {
      setErrorPago("Ingresa un monto válido.");
      return;
    }
    if (monto > saldo) {
      setErrorPago(`El pago no puede ser mayor al saldo pendiente (${soles(saldo)}).`);
      return;
    }
    if (modalPago.tipo === "factura") {
      const actualizada = await facturasService.registrarPagoFactura(modalPago.doc.id, monto);
      setListaActual((prev) => prev.map((f) => (f.id === actualizada.id ? actualizada : f)));
    } else {
      const actualizada = await facturasService.registrarPagoFacturaPorPagar(modalPago.doc.id, monto);
      setListaActual((prev) => prev.map((f) => (f.id === actualizada.id ? actualizada : f)));
    }
    setModalPago(null);
  }

  function marcarComprobanteSubido(id) {
    // TODO backend: POST /api/facturas/:id/comprobante (o el endpoint que
    // corresponda) — sube el archivo real y guarda su URL definitiva.
    setListaActual((prev) => prev.map((x) => (x.id === id ? { ...x, archivo: true } : x)));
  }

  const tituloNuevo = { facturas: "Nueva factura", facturasPagar: "Nueva factura por pagar", gastos: "Nuevo gasto" }[tab];

  return (
    <AppShell
      title="Finanzas"
      topbarExtra={
        <button className="btn-primary" onClick={abrirNuevo} type="button">
          <IconPlus width={15} height={15} />
          {tituloNuevo}
        </button>
      }
    >
      <div className="tabs">
        <button className={tab === "facturas" ? "active" : ""} onClick={() => { setTab("facturas"); setFiltroEstado(""); setBusqueda(""); }}>
          Facturas
        </button>
        <button className={tab === "facturasPagar" ? "active" : ""} onClick={() => { setTab("facturasPagar"); setFiltroEstado(""); setBusqueda(""); }}>
          Facturas por pagar
        </button>
        <button className={tab === "gastos" ? "active" : ""} onClick={() => { setTab("gastos"); setFiltroEstado(""); setBusqueda(""); }}>
          Gastos
        </button>
      </div>

      <div className="filters">
        <div className="search">
          <input
            placeholder={tab === "gastos" ? "Buscar categoría..." : tab === "facturas" ? "Buscar cliente..." : "Buscar proveedor..."}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <select value={filtroEmpresa} onChange={(e) => setFiltroEmpresa(e.target.value)}>
          <option value="">Todas las empresas</option>
          <option value="corevex">CorevexSAC</option>
          <option value="electro">ElectroSAC</option>
        </select>
        {tab !== "gastos" && (
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="parcial">Pago parcial</option>
            <option value="pagado">Pagado</option>
          </select>
        )}
      </div>

      {tab === "facturas" && (
        <FacturasGrid
          cargando={cargando}
          error={error}
          onReintentar={reload}
          facturas={facturas}
          onNuevo={abrirNuevo}
          onSubirComprobante={marcarComprobanteSubido}
          onRegistrarPago={abrirRegistrarPago}
        />
      )}

      {tab === "facturasPagar" && (
        <FacturasPorPagarGrid
          cargando={cargando}
          error={error}
          onReintentar={reload}
          facturas={facturasPagar}
          onNuevo={abrirNuevo}
          onSubirComprobante={marcarComprobanteSubido}
          onRegistrarPago={abrirRegistrarPago}
        />
      )}

      {tab === "gastos" && (
        <GastosGrid
          cargando={cargando}
          error={error}
          onReintentar={reload}
          gastos={gastos}
          onNuevo={abrirNuevo}
          onSubirComprobante={marcarComprobanteSubido}
        />
      )}

      <ModalNuevaFactura
        open={modalNuevo && tab === "facturas"}
        onClose={() => setModalNuevo(false)}
        fFactura={fFactura}
        setFFactura={setFFactura}
        onSubmit={handleGuardarFactura}
      />

      <ModalNuevaFacturaPagar
        open={modalNuevo && tab === "facturasPagar"}
        onClose={() => setModalNuevo(false)}
        fFacturaPagar={fFacturaPagar}
        setFFacturaPagar={setFFacturaPagar}
        onSubmit={handleGuardarFacturaPagar}
      />

      <ModalNuevoGasto
        open={modalNuevo && tab === "gastos"}
        onClose={() => setModalNuevo(false)}
        fGasto={fGasto}
        setFGasto={setFGasto}
        onSubmit={handleGuardarGasto}
      />

      <ModalRegistrarPago
        open={!!modalPago}
        pago={modalPago}
        montoPago={montoPago}
        setMontoPago={(v) => { setMontoPago(v); setErrorPago(""); }}
        errorPago={errorPago}
        onClose={() => setModalPago(null)}
        onConfirmar={handleConfirmarPago}
      />
    </AppShell>
  );
}
