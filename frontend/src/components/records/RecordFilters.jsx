import React from "react";
import { title } from "../../utils/format.js";

export default function RecordFilters({ controller }) {
  const {
    search,
    setSearch,
    setListFilter,
    movement,
    filter,
    setFilter,
    trade,
    page,
    meta,
    category,
    setCategory,
    lookups,
    movementType,
    setMovementType,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
  } = controller;
  return (
    <div className="filters">
      <input
        aria-label="Buscar registros"
        placeholder="Buscar en los registros…"
        value={search}
        onChange={(e) => setListFilter(setSearch, e.target.value)}
      />
      {!movement && (
        <select
          aria-label="Filtrar registros"
          value={filter}
          onChange={(e) => setListFilter(setFilter, e.target.value)}
        >
          <option value="todos">Todos</option>
          {(trade
            ? ["borrador", "confirmada", "cancelada"]
            : page === "productos"
              ? ["activo", "inactivo", "bajo"]
              : meta[page]?.fields.estado
                ? ["activo", "inactivo"]
                : []
          ).map((s) => (
            <option key={s} value={s}>
              {title(s)}
            </option>
          ))}
        </select>
      )}
      {page === "productos" && (
        <select
          aria-label="Categoría"
          value={category}
          onChange={(e) => setListFilter(setCategory, e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {(lookups.categorias || []).map((c) => (
            <option key={c.id_categoria} value={c.id_categoria}>
              {c.nombre}
            </option>
          ))}
        </select>
      )}
      {movement && (
        <select
          aria-label="Tipo de movimiento"
          value={movementType}
          onChange={(e) => setListFilter(setMovementType, e.target.value)}
        >
          <option value="">Todos los movimientos</option>
          <option value="entrada">Entradas</option>
          <option value="salida">Salidas</option>
        </select>
      )}
      {(trade || movement) && (
        <>
          <label>
            Desde
            <input
              aria-label="Desde"
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => setListFilter(setFromDate, e.target.value)}
            />
          </label>
          <label>
            Hasta
            <input
              aria-label="Hasta"
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => setListFilter(setToDate, e.target.value)}
            />
          </label>
        </>
      )}
    </div>
  );
}
