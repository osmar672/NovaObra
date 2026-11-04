import React from "react";

export const money = (value) =>
  new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC" }).format(
    Number(value || 0),
  );
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export async function downloadCSV(path, filename) {
  const response = await fetch(`/api/${path}`);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || "No se pudo descargar el CSV.");
  }
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function StockPanel({ products, onReview, onExport, disabled }) {
  return (
    <section className="panel stock-panel">
      <div className="toolbar">
        <div>
          <h2>Lista de reposición</h2>
          <p>
            Productos activos con existencias menores o iguales al mínimo. La
            sugerencia repone hasta el mínimo más una unidad.
          </p>
        </div>
        <span className="badge attention">{products.length} por reponer</span>
      </div>
      <div className="actions wrap-actions">
        <button onClick={onReview}>Ver productos por reponer</button>
        <button className="secondary" onClick={onExport} disabled={disabled}>
          Exportar reposición CSV
        </button>
      </div>
      {products.length ? (
        <div className="table-wrap stock-list">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Stock</th>
                <th>Mínimo</th>
                <th>Reponer</th>
                <th>Costo estimado</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id_producto}>
                  <td>{p.codigo}</td>
                  <td>{p.nombre}</td>
                  <td>{p.categoria_nombre}</td>
                  <td>
                    <span className="badge attention">{p.stock}</span>
                  </td>
                  <td>{p.stock_minimo}</td>
                  <td>{p.faltante}</td>
                  <td>{money(p.costo_reposicion)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty">
          El inventario activo está por encima de sus mínimos.
        </p>
      )}
    </section>
  );
}

export function ReportsPanel({
  data,
  range,
  onRangeChange,
  onExport,
  loading,
  busy,
}) {
  const summary = data?.resumen;
  return (
    <>
      <section className="panel">
        <div className="toolbar">
          <div>
            <h2>Resultados del período</h2>
            <p>
              Solo se incluyen compras y ventas confirmadas. Las operaciones
              canceladas y los borradores quedan excluidos.
            </p>
          </div>
          <button
            className="secondary"
            disabled={loading || busy || !data}
            onClick={onExport}
          >
            Descargar CSV
          </button>
        </div>
        <div className="filters report-filters">
          <label>
            Desde
            <input
              aria-label="Desde"
              type="date"
              value={range.desde}
              max={range.hasta || undefined}
              onChange={(e) =>
                onRangeChange({ ...range, desde: e.target.value })
              }
            />
          </label>
          <label>
            Hasta
            <input
              aria-label="Hasta"
              type="date"
              value={range.hasta}
              min={range.desde || undefined}
              onChange={(e) =>
                onRangeChange({ ...range, hasta: e.target.value })
              }
            />
          </label>
        </div>
        <p className="report-criterion">
          {data?.criterio_ganancia ||
            "Ganancia estimada = ventas menos el costo actual del catálogo para las unidades vendidas. No representa una utilidad contable histórica."}
        </p>
      </section>
      {summary && (
        <section className="cards report-cards">
          <article className="card">
            <span>Ventas confirmadas</span>
            <strong>{money(summary.ventas)}</strong>
            <small>{summary.cantidad_ventas} ventas</small>
          </article>
          <article className="card">
            <span>Compras confirmadas</span>
            <strong>{money(summary.compras)}</strong>
            <small>{summary.cantidad_compras} compras</small>
          </article>
          <article className="card">
            <span>Ganancia estimada</span>
            <strong>{money(summary.ganancia_estimada)}</strong>
            <small>
              Costo actual estimado: {money(summary.costo_estimado)}
            </small>
          </article>
        </section>
      )}
      <section className="panel">
        <h2>Productos más vendidos</h2>
        <p>Ordenados por unidades vendidas durante el período seleccionado.</p>
        {!data?.mas_vendidos?.length ? (
          <p className="empty">No hay ventas confirmadas en este período.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Unidades</th>
                  <th>Ingresos</th>
                  <th>Costo estimado</th>
                  <th>Ganancia estimada</th>
                </tr>
              </thead>
              <tbody>
                {data.mas_vendidos.map((p) => (
                  <tr key={p.id_producto}>
                    <td>{p.codigo}</td>
                    <td>{p.producto_nombre}</td>
                    <td>{p.cantidad}</td>
                    <td>{money(p.ingresos)}</td>
                    <td>{money(p.costo_estimado)}</td>
                    <td>{money(p.ganancia_estimada)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

export function Receipt({ data, onClose }) {
  return (
    <section
      className="panel receipt-preview"
      aria-label="Comprobante de venta"
    >
      <div className="toolbar receipt-controls">
        <button className="secondary" onClick={onClose}>
          Cerrar comprobante
        </button>
        <button onClick={() => window.print()}>Imprimir / Guardar PDF</button>
      </div>
      <div className="receipt-heading">
        <div>
          <p className="eyebrow">FERRETERÍA NOVAOBRA</p>
          <h2>Comprobante de venta #{data.id_venta}</h2>
          <p>Comprobante interno · No es una factura electrónica</p>
        </div>
        <span className={"badge " + data.estado}>{data.estado}</span>
      </div>
      <dl className="receipt-info">
        <div>
          <dt>Cliente</dt>
          <dd>{data.cliente_nombre}</dd>
        </div>
        <div>
          <dt>Fecha</dt>
          <dd>{data.fecha_venta}</dd>
        </div>
        <div>
          <dt>Empleado</dt>
          <dd>{data.empleado_nombre}</dd>
        </div>
        {data.cliente_telefono && (
          <div>
            <dt>Teléfono</dt>
            <dd>{data.cliente_telefono}</dd>
          </div>
        )}
        {data.cliente_correo && (
          <div>
            <dt>Correo</dt>
            <dd>{data.cliente_correo}</dd>
          </div>
        )}
        {data.cliente_direccion && (
          <div>
            <dt>Dirección</dt>
            <dd>{data.cliente_direccion}</dd>
          </div>
        )}
      </dl>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Precio unitario</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {data.detalles.map((l) => (
              <tr key={l.id_detalle_venta}>
                <td>{l.producto_codigo}</td>
                <td>{l.producto_nombre}</td>
                <td>{l.cantidad}</td>
                <td>{money(l.precio_unitario)}</td>
                <td>{money(l.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="receipt-total">
        Total: <strong>{money(data.total)}</strong>
      </p>
      {data.estado === "cancelada" && (
        <p className="receipt-cancelled">
          Operación cancelada. Este documento conserva el historial y no
          acredita una venta vigente.
        </p>
      )}
      {data.estado === "borrador" && (
        <p className="receipt-cancelled">
          Borrador sin confirmar. Documento informativo: no acredita una venta
          vigente.
        </p>
      )}
      <p className="receipt-note">
        Gracias por elegir Ferretería NovaObra. Para guardar este comprobante,
        selecciona Guardar como PDF en el diálogo de impresión del navegador.
      </p>
    </section>
  );
}
