import React from "react";
import StockPanel from "../../components/inventory/StockPanel.jsx";
import { title } from "../../utils/format.js";

export default function DashboardPage({
  dashboard,
  lowStock,
  busy,
  navigate,
  exportFile,
}) {
  if (!dashboard) return null;
  return (
    <>
      <section className="cards">
        {Object.entries(dashboard)
          .filter(([k]) => k !== "movimientos")
          .map(([k, v]) => (
            <article className="card" key={k}>
              <span>{title(k)}</span>
              <strong>{v}</strong>
              <small>
                {k === "inventario_bajo"
                  ? "Productos por reponer"
                  : "Registros en el sistema"}
              </small>
            </article>
          ))}
      </section>
      <section className="panel">
        <h2>Actividad de inventario</h2>
        <p>
          Entradas y salidas registradas, incluidos los ajustes compensatorios.
        </p>
        {dashboard.movimientos.length ? (
          <div className="activity">
            {dashboard.movimientos.map((m) => (
              <div key={m.tipo_movimiento}>
                <span className="badge">{title(m.tipo_movimiento)}</span>
                <h3>{m.cantidad} unidades</h3>
                <p>{m.operaciones} movimientos</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty">Aún no hay movimientos registrados.</p>
        )}
      </section>
      <StockPanel
        products={lowStock}
        disabled={busy}
        onReview={() => navigate("productos", { lowStock: true })}
        onExport={() =>
          exportFile("inventario-bajo/exportar.csv", "NovaObra_Reposicion.csv")
        }
      />
      <section className="panel">
        <h2>Operaciones del día a día</h2>
        <p>
          Crea un borrador de compra o venta, agrega sus productos y confírmalo
          para actualizar el inventario.
        </p>
        <div className="actions">
          <button onClick={() => navigate("compras")}>Ir a compras</button>
          <button className="secondary" onClick={() => navigate("ventas")}>
            Ir a ventas
          </button>
        </div>
      </section>
    </>
  );
}
