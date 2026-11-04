import React from "react";
import { money } from "../../utils/format.js";

export default function StockPanel({ products, onReview, onExport, disabled }) {
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
