import React from "react";
import { money, title } from "../../utils/format.js";

export default function TradeLines({ controller, detailService }) {
  const { lines, setLines, lookups } = controller;
  const { priceField: price, productPriceField } = detailService;
  return (
    <div className="details">
      <h3>Productos de la operación</h3>
      {lines.map((l, i) => (
        <div className="detail-row" key={i}>
          <label>
            Producto
            <select
              aria-label="Producto"
              required
              value={l.id_producto}
              onChange={(e) => {
                const next = [...lines];
                const p = lookups.productos.find(
                  (p) => p.id_producto === Number(e.target.value),
                );
                next[i] = {
                  ...l,
                  id_producto: e.target.value,
                  [price]: p ? p[productPriceField] : 0,
                };
                setLines(next);
              }}
            >
              <option value="">Seleccione…</option>
              {(lookups.productos || []).map((p) => (
                <option key={p.id_producto} value={p.id_producto}>
                  {p.nombre} · Stock {p.stock}
                </option>
              ))}
            </select>
          </label>
          <label>
            Cantidad
            <input
              aria-label="Cantidad"
              required
              type="number"
              min="1"
              max="1000000"
              step="1"
              value={l.cantidad}
              onChange={(e) =>
                setLines(
                  lines.map((x, j) =>
                    j === i ? { ...x, cantidad: e.target.value } : x,
                  ),
                )
              }
            />
          </label>
          <label>
            {title(price)}
            <input
              aria-label={title(price)}
              required
              type="number"
              min="0"
              max="9999999999.99"
              step="0.01"
              value={l[price]}
              onChange={(e) =>
                setLines(
                  lines.map((x, j) =>
                    j === i ? { ...x, [price]: e.target.value } : x,
                  ),
                )
              }
            />
          </label>
          <button
            type="button"
            className="secondary"
            onClick={() => setLines(lines.filter((_, j) => j !== i))}
          >
            Quitar
          </button>
        </div>
      ))}
      <button
        className="secondary"
        type="button"
        onClick={() =>
          setLines([...lines, { id_producto: "", cantidad: 1, [price]: 0 }])
        }
      >
        Agregar producto
      </button>
      <p className="trade-total">
        Total:{" "}
        {money(
          lines.reduce(
            (s, l) =>
              s + Math.round(Number(l[price]) * 100) * Number(l.cantidad),
            0,
          ) / 100,
        )}
      </p>
    </div>
  );
}
