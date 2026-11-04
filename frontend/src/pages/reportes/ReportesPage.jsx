import React from "react";
import { money } from "../../utils/format.js";

export default function ReportesPage({
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
