import React from "react";
import { title, money } from "../../utils/format.js";

export default function RecordsTable({ controller }) {
  const {
    loading,
    visible,
    columns,
    columnNames,
    movement,
    pk,
    page,
    trade,
    busy,
    edit,
    remove,
    showReceipt,
    action,
    cellValue,
  } = controller;
  return (
    <>
      {loading ? (
        <div className="empty">Consultando registros…</div>
      ) : !visible.length ? (
        <div className="empty">No hay registros para mostrar.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {columns.map((k) => (
                  <th key={k}>{columnNames[k] || title(k)}</th>
                ))}
                {!movement && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr
                  key={r[pk]}
                  className={
                    page === "productos" &&
                    r.estado === "activo" &&
                    r.stock <= r.stock_minimo
                      ? "low-stock-row"
                      : undefined
                  }
                >
                  {columns.map((k) => (
                    <td key={k}>
                      {k === "estado" ? (
                        <span className={"badge " + r[k]}>{r[k]}</span>
                      ) : k.includes("precio") || k === "total" ? (
                        money(r[k])
                      ) : k === "stock" &&
                        r.estado === "activo" &&
                        r.stock <= r.stock_minimo ? (
                        <span
                          className="badge attention"
                          title="Inventario por reponer"
                        >
                          {r[k]}
                        </span>
                      ) : (
                        String(cellValue(r, k) ?? "—")
                      )}
                    </td>
                  ))}
                  {!movement && (
                    <td>
                      <div className="row-actions">
                        {(!trade || r.estado === "borrador") && (
                          <>
                            <button
                              className="link"
                              disabled={busy}
                              onClick={() => edit(r)}
                            >
                              Editar
                            </button>
                            <button
                              className="link danger"
                              disabled={busy}
                              onClick={() => remove(r)}
                            >
                              Eliminar
                            </button>
                          </>
                        )}
                        {trade && (
                          <>
                            <button
                              className="link"
                              disabled={busy}
                              onClick={() => edit(r)}
                            >
                              Detalles
                            </button>
                            {page === "ventas" && (
                              <button
                                className="link"
                                disabled={busy}
                                onClick={() => showReceipt(r)}
                              >
                                Comprobante
                              </button>
                            )}
                            {r.estado === "borrador" && (
                              <button
                                className="link"
                                disabled={busy}
                                onClick={() => action(r, "confirmar")}
                              >
                                Confirmar
                              </button>
                            )}
                            {r.estado !== "cancelada" && (
                              <button
                                className="link danger"
                                disabled={busy}
                                onClick={() => action(r, "cancelar")}
                              >
                                Cancelar
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
