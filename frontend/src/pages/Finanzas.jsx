import { AppShell } from "../components/layout/AppShell";
import { IconPlus } from "../components/icons/Icons";
import { useFinanzasManager } from "../hooks/useFinanzasManager";
import FacturasGrid from "../components/finanzas/FacturasGrid";
import FacturasPorPagarGrid from "../components/finanzas/FacturasPorPagarGrid";
import GastosGrid from "../components/finanzas/GastosGrid";
import ModalNuevaFactura from "../components/finanzas/ModalNuevaFactura";
import ModalNuevaFacturaPagar from "../components/finanzas/ModalNuevaFacturaPagar";
import ModalNuevoGasto from "../components/finanzas/ModalNuevoGasto";
import ModalCategoriasGasto from "../components/finanzas/ModalCategoriasGasto";
import ModalRegistrarPago from "../components/finanzas/ModalRegistrarPago";
import "./Finanzas.css";

export default function Finanzas() {
  const f = useFinanzasManager();

  return (
    <AppShell
      title="Finanzas"
      topbarExtra={
        <button className="btn-primary" onClick={f.abrirNuevo} type="button">
          <IconPlus width={15} height={15} />
          {f.tituloNuevo}
        </button>
      }
    >
      <div className="tabs" role="tablist" aria-label="Facturas, facturas por pagar o gastos">
        <button
          id="tab-facturas"
          role="tab"
          aria-selected={f.tab === "facturas"}
          aria-controls="panel-finanzas"
          className={f.tab === "facturas" ? "active" : ""}
          onClick={() => f.cambiarTab("facturas")}
        >
          Facturas
        </button>
        <button
          id="tab-facturasPagar"
          role="tab"
          aria-selected={f.tab === "facturasPagar"}
          aria-controls="panel-finanzas"
          className={f.tab === "facturasPagar" ? "active" : ""}
          onClick={() => f.cambiarTab("facturasPagar")}
        >
          Facturas por pagar
        </button>
        <button
          id="tab-gastos"
          role="tab"
          aria-selected={f.tab === "gastos"}
          aria-controls="panel-finanzas"
          className={f.tab === "gastos" ? "active" : ""}
          onClick={() => f.cambiarTab("gastos")}
        >
          Gastos
        </button>
      </div>

      <div className="filters">
        <div className="search">
          <label htmlFor="buscar-finanzas" className="sr-only">
            {f.tab === "gastos" ? "Buscar categoría" : f.tab === "facturas" ? "Buscar cliente" : "Buscar proveedor"}
          </label>
          <input
            id="buscar-finanzas"
            type="search"
            placeholder={f.tab === "gastos" ? "Buscar categoría..." : f.tab === "facturas" ? "Buscar cliente..." : "Buscar proveedor..."}
            value={f.busqueda}
            onChange={(e) => f.setBusqueda(e.target.value)}
          />
        </div>
        <select value={f.filtroEmpresa} onChange={(e) => f.setFiltroEmpresa(e.target.value)} aria-label="Filtrar por empresa">
          <option value="">Todas las empresas</option>
          <option value="corevex">CorevexSAC</option>
          <option value="electro">ElectroSAC</option>
        </select>
        {f.tab !== "gastos" && (
          <select value={f.filtroEstado} onChange={(e) => f.setFiltroEstado(e.target.value)} aria-label="Filtrar por estado">
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="parcial">Pago parcial</option>
            <option value="pagado">Pagado</option>
          </select>
        )}
      </div>

      <div id="panel-finanzas" role="tabpanel" aria-labelledby={`tab-${f.tab}`}>
        {f.tab === "facturas" && (
          <FacturasGrid
            cargando={f.cargando}
            error={f.error}
            onReintentar={f.reload}
            facturas={f.facturas}
            onNuevo={f.abrirNuevo}
            onSubirComprobante={f.marcarComprobanteSubido}
            onRegistrarPago={f.abrirRegistrarPago}
            onEditar={f.abrirEditarFactura}
            onAnular={f.handleAnularFactura}
          />
        )}

        {f.tab === "facturasPagar" && (
          <FacturasPorPagarGrid
            cargando={f.cargando}
            error={f.error}
            onReintentar={f.reload}
            facturas={f.facturasPagar}
            onNuevo={f.abrirNuevo}
            onSubirComprobante={f.marcarComprobanteSubido}
            onRegistrarPago={f.abrirRegistrarPago}
            onEditar={f.abrirEditarFacturaPagar}
            onAnular={f.handleAnularFacturaPagar}
          />
        )}

        {f.tab === "gastos" && (
          <GastosGrid
            cargando={f.cargando}
            error={f.error}
            onReintentar={f.reload}
            gastos={f.gastos}
            onNuevo={f.abrirNuevo}
            onSubirComprobante={f.marcarComprobanteSubido}
            onEditar={f.abrirEditarGasto}
            onEliminar={f.handleEliminarGasto}
          />
        )}
      </div>

      <ModalNuevaFactura
        open={f.modalNuevo && f.tab === "facturas"}
        onClose={f.cerrarModalNuevo}
        fFactura={f.fFactura}
        setFFactura={f.setFFactura}
        onSubmit={f.handleGuardarFactura}
        editando={!!f.idEditando}
        error={f.errorFormulario}
        catalogoDetraccion={f.catalogoDetraccion}
      />

      <ModalNuevaFacturaPagar
        open={f.modalNuevo && f.tab === "facturasPagar"}
        onClose={f.cerrarModalNuevo}
        fFacturaPagar={f.fFacturaPagar}
        setFFacturaPagar={f.setFFacturaPagar}
        onSubmit={f.handleGuardarFacturaPagar}
        editando={!!f.idEditando}
        error={f.errorFormulario}
        catalogoDetraccion={f.catalogoDetraccion}
      />

      <ModalNuevoGasto
        open={f.modalNuevo && f.tab === "gastos"}
        onClose={f.cerrarModalNuevo}
        fGasto={f.fGasto}
        setFGasto={f.setFGasto}
        onSubmit={f.handleGuardarGasto}
        editando={!!f.idEditando}
        categoriasGasto={f.categoriasGasto}
        nuevaCategoriaGasto={f.nuevaCategoriaGasto}
        setNuevaCategoriaGasto={f.setNuevaCategoriaGasto}
        nombreNuevaCategoriaGasto={f.nombreNuevaCategoriaGasto}
        setNombreNuevaCategoriaGasto={f.setNombreNuevaCategoriaGasto}
        errorCategoriaGasto={f.errorCategoriaGasto}
        onAgregarCategoriaGasto={f.handleAgregarCategoriaGasto}
        onAbrirGestionCategorias={() => f.setModalCategoriasGasto(true)}
        error={f.errorFormulario}
      />

      <ModalCategoriasGasto
        open={f.modalCategoriasGasto}
        onClose={() => f.setModalCategoriasGasto(false)}
        categorias={f.categoriasGasto}
        onRenombrar={f.handleRenombrarCategoriaGasto}
        onEliminar={f.handleEliminarCategoriaGasto}
      />

      <ModalRegistrarPago
        open={!!f.modalPago}
        pago={f.modalPago}
        montoPago={f.montoPago}
        setMontoPago={f.cambiarMontoPago}
        errorPago={f.errorPago}
        onClose={() => f.setModalPago(null)}
        onConfirmar={f.handleConfirmarPago}
      />
    </AppShell>
  );
}
