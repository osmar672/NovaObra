import React from "react";
import RecordFilters from "./RecordFilters.jsx";
import RecordsTable from "./RecordsTable.jsx";
import Pagination from "./Pagination.jsx";
import EntityEditor from "../forms/EntityEditor.jsx";

export default function RecordsPage({ controller }) {
  const {
    definition,
    pagination,
    loading,
    busy,
    page,
    exportFile,
    exportQuery,
    fresh,
    movement,
    form,
  } = controller;
  return (
    <>
      <section className="panel">
        <div className="toolbar">
          <div>
            <h2>Registros de {definition.label.toLowerCase()}</h2>
            <span className="muted">{pagination.total} resultados</span>
          </div>
          <div className="actions wrap-actions">
            <button
              className="secondary"
              disabled={loading || busy}
              onClick={() =>
                exportFile(
                  `${page}/exportar.csv?${exportQuery}`,
                  `NovaObra_${page}.csv`,
                )
              }
            >
              Descargar CSV
            </button>
            <button onClick={fresh} disabled={busy || loading}>
              + {movement ? "Registrar ajuste" : "Crear registro"}
            </button>
          </div>
        </div>
        <RecordFilters controller={controller} />
        <RecordsTable controller={controller} />
        <Pagination controller={controller} />
        {movement && (
          <p className="muted">
            El historial es inmutable. Para corregir una entrada o salida
            registra un movimiento compensatorio.
          </p>
        )}
      </section>
      {form && <EntityEditor controller={controller} />}
    </>
  );
}
