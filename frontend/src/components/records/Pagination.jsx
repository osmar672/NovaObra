import React from "react";

export default function Pagination({ controller }) {
  const {
    pageSize,
    setPageSize,
    setListFilter,
    pageNumber,
    setPageNumber,
    pagination,
    loading,
    busy,
  } = controller;
  return (
    <div className="pagination">
      <label>
        Registros por página
        <select
          aria-label="Registros por página"
          value={pageSize}
          onChange={(e) => setListFilter(setPageSize, Number(e.target.value))}
        >
          {[10, 25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <span aria-live="polite">
        Página {pageNumber} de {pagination.paginas}
      </span>
      <div className="actions">
        <button
          className="secondary"
          disabled={loading || busy || pageNumber <= 1}
          onClick={() => setPageNumber((n) => n - 1)}
        >
          Anterior
        </button>
        <button
          className="secondary"
          disabled={loading || busy || pageNumber >= pagination.paginas}
          onClick={() => setPageNumber((n) => n + 1)}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
