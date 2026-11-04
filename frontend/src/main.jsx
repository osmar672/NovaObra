import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import {
  money,
  localDay,
  downloadCSV,
  StockPanel,
  ReportsPanel,
  Receipt,
} from "./features.jsx";
const labels = {
  dashboard: "Inicio",
  productos: "Productos",
  categorias: "Categorías",
  proveedores: "Proveedores",
  clientes: "Clientes",
  empleados: "Empleados",
  compras: "Compras",
  ventas: "Ventas",
  movimientos_inventario: "Inventario",
  reportes: "Reportes",
};
const title = (s) =>
  s.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
async function request(path, method = "GET", body, signal) {
  const r = await fetch("/api/" + path, {
    method,
    signal,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (r.status === 204) return null;
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Error de conexión.");
  return data;
}
function App() {
  // Invalidate old reads immediately on navigation, including a return to the same page.
  const activePage = useRef("dashboard");
  const viewVersion = useRef(0);
  const loadVersion = useRef(0);
  const editVersion = useRef(0);
  const loadController = useRef(null);
  const editController = useRef(null);
  const [page, setPage] = useState("dashboard"),
    [meta, setMeta] = useState({}),
    [data, setData] = useState([]),
    [dashboard, setDashboard] = useState(null),
    [lookups, setLookups] = useState({}),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("todos"),
    [form, setForm] = useState(null),
    [editing, setEditing] = useState(null),
    [lines, setLines] = useState([]),
    [requestKey, setRequestKey] = useState(""),
    [category, setCategory] = useState(""),
    [fromDate, setFromDate] = useState(""),
    [toDate, setToDate] = useState(""),
    [movementType, setMovementType] = useState(""),
    [pageNumber, setPageNumber] = useState(1),
    [pageSize, setPageSize] = useState(10),
    [pagination, setPagination] = useState({ total: 0, paginas: 1 }),
    [lowStock, setLowStock] = useState([]),
    [report, setReport] = useState(null),
    [reportRange, setReportRange] = useState(() => ({
      desde: localDay().slice(0, 8) + "01",
      hasta: localDay(),
    })),
    [receipt, setReceipt] = useState(null);
  const listQuery = useMemo(() => {
    const params = new URLSearchParams({
      pagina: String(pageNumber),
      limite: String(pageSize),
    });
    if (search.trim()) params.set("q", search.trim());
    if (filter === "bajo") {
      params.set("stock", "bajo");
      params.set("estado", "activo");
    } else if (filter !== "todos") params.set("estado", filter);
    if (category) params.set("categoria", category);
    if (fromDate) params.set("desde", fromDate);
    if (toDate) params.set("hasta", toDate);
    if (movementType) params.set("tipo_movimiento", movementType);
    return params.toString();
  }, [
    search,
    filter,
    category,
    fromDate,
    toDate,
    movementType,
    pageNumber,
    pageSize,
  ]);
  const exportQuery = useMemo(() => {
    const params = new URLSearchParams(listQuery);
    params.delete("pagina");
    params.delete("limite");
    return params.toString();
  }, [listQuery]);
  const reportQuery = useMemo(
    () =>
      new URLSearchParams(
        Object.entries(reportRange).filter(([, value]) => value),
      ).toString(),
    [reportRange],
  );
  const resourcePath =
    page === "dashboard"
      ? "dashboard"
      : page === "reportes"
        ? `reportes?${reportQuery}`
        : `${page}?${listQuery}`;
  const trade = ["compras", "ventas"].includes(page),
    movement = page === "movimientos_inventario";
  const pk =
    meta[page]?.pk ||
    (page === "compras"
      ? "id_compra"
      : page === "ventas"
        ? "id_venta"
        : "id_movimiento");
  const fields =
    meta[page]?.fields ||
    (trade
      ? {
          [page === "compras" ? "id_proveedor" : "id_cliente"]: "id",
          id_empleado: "id",
        }
      : {
          id_producto: "id",
          tipo_movimiento: "movement",
          cantidad: "quantity",
          descripcion: "text",
        });
  const load = useCallback(async () => {
    if (activePage.current !== page) return;
    const view = viewVersion.current;
    const version = ++loadVersion.current;
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    const current = () =>
      activePage.current === page &&
      viewVersion.current === view &&
      loadVersion.current === version &&
      !controller.signal.aborted;
    const get = (path) => request(path, "GET", undefined, controller.signal);
    setLoading(true);
    setError("");
    if (page === "reportes") setReport(null);
    else if (page !== "dashboard") setData([]);
    try {
      const [metadata, result, stockResult, ...lists] = await Promise.all([
        get("metadata"),
        get(resourcePath),
        page === "dashboard" ? get("inventario-bajo") : Promise.resolve(null),
        ...[
          "productos",
          "categorias",
          "proveedores",
          "clientes",
          "empleados",
        ].map(get),
      ]);
      if (!current()) return;
      setMeta(metadata);
      if (page === "dashboard") {
        setDashboard(result);
        setLowStock(stockResult);
      } else if (page === "reportes") setReport(result);
      else {
        setData(result.datos);
        setPagination({
          total: result.total,
          paginas: Math.max(1, result.paginas),
        });
        if (pageNumber > Math.max(1, result.paginas))
          setPageNumber(Math.max(1, result.paginas));
      }
      setLookups(
        Object.fromEntries(
          [
            "productos",
            "categorias",
            "proveedores",
            "clientes",
            "empleados",
          ].map((name, i) => [name, lists[i]]),
        ),
      );
    } catch (e) {
      if (current() && e.name !== "AbortError") setError(e.message);
    } finally {
      if (current()) setLoading(false);
      if (loadController.current === controller) loadController.current = null;
    }
  }, [page, resourcePath, pageNumber]);
  useEffect(() => {
    load();
    return () => {
      loadController.current?.abort();
      editController.current?.abort();
    };
  }, [load]);
  useEffect(() => {
    if (receipt)
      document
        .querySelector(".receipt-preview")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [receipt]);
  function navigate(p, options = {}) {
    if (p === activePage.current) return;
    activePage.current = p;
    viewVersion.current++;
    loadVersion.current++;
    editVersion.current++;
    loadController.current?.abort();
    editController.current?.abort();
    setPage(p);
    setData([]);
    setDashboard(null);
    setLoading(true);
    setBusy(false);
    setForm(null);
    setEditing(null);
    setSearch("");
    setFilter(options.lowStock ? "bajo" : "todos");
    setCategory("");
    setFromDate("");
    setToDate("");
    setMovementType("");
    setPageNumber(1);
    setReceipt(null);
    setNotice("");
    setError("");
  }
  function fresh() {
    setPageNumber(1);
    setReceipt(null);
    setRequestKey(crypto.randomUUID());
    setEditing(null);
    setForm(
      Object.fromEntries(
        Object.entries(fields).map(([k, t]) => [
          k,
          t === "active"
            ? "activo"
            : t === "movement"
              ? "entrada"
              : t === "date"
                ? localDay()
                : ["quantity", "money"].includes(t)
                  ? 0
                  : "",
        ]),
      ),
    );
    setLines([]);
    setError("");
  }
  async function edit(row) {
    const view = viewVersion.current;
    const version = ++editVersion.current;
    editController.current?.abort();
    const controller = new AbortController();
    editController.current = controller;
    const current = () =>
      activePage.current === page &&
      viewVersion.current === view &&
      editVersion.current === version &&
      !controller.signal.aborted;
    setBusy(true);
    try {
      const full = trade
        ? await request(
            `${page}/${row[pk]}`,
            "GET",
            undefined,
            controller.signal,
          )
        : row;
      if (!current()) return;
      setEditing(row[pk]);
      setForm(
        Object.fromEntries(Object.keys(fields).map((k) => [k, full[k] ?? ""])),
      );
      setLines(
        full.detalles?.map((l) => ({
          id_producto: l.id_producto,
          cantidad: l.cantidad,
          [page === "compras" ? "costo_unitario" : "precio_unitario"]:
            l[page === "compras" ? "costo_unitario" : "precio_unitario"],
        })) || [],
      );
      setError("");
    } catch (e) {
      if (current() && e.name !== "AbortError") setError(e.message);
    } finally {
      if (current()) setBusy(false);
      if (editController.current === controller) editController.current = null;
    }
  }
  async function perform(fn, message) {
    // A sales write invalidates every printable snapshot, including pending reads.
    if (page === "ventas") {
      setReceipt(null);
      editVersion.current++;
      editController.current?.abort();
      editController.current = null;
    }
    const view = viewVersion.current;
    const current = () =>
      activePage.current === page && viewVersion.current === view;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      // Writes may already have committed on the server, so only reads are aborted.
      await fn();
      if (!current()) return false;
      setNotice(message);
      await load();
      return current();
    } catch (e) {
      if (current()) setError(e.message);
      return false;
    } finally {
      if (current()) setBusy(false);
    }
  }
  async function save(e) {
    e.preventDefault();
    const body = Object.fromEntries(
      Object.entries(fields).map(([k, t]) => [
        k,
        ["id", "money", "quantity"].includes(t) ? Number(form[k]) : form[k],
      ]),
    );
    if (!editing && (trade || movement)) body.clave_solicitud = requestKey;
    if (trade)
      body.detalles = lines.map((l) =>
        Object.fromEntries(Object.entries(l).map(([k, v]) => [k, Number(v)])),
      );
    const ok = await perform(
      () =>
        request(
          page + (editing ? "/" + editing : ""),
          editing ? "PUT" : "POST",
          body,
        ),
      "Registro guardado.",
    );
    if (ok) setForm(null);
  }
  async function remove(row) {
    if (!window.confirm(`¿Eliminar el registro #${row[pk]}?`)) return;
    await perform(
      () => request(`${page}/${row[pk]}`, "DELETE"),
      "Registro eliminado.",
    );
  }
  async function action(row, a) {
    if (
      !window.confirm(
        `¿${title(a)} ${page} #${row[pk]}? Esta operación modifica su estado y puede afectar el inventario.`,
      )
    )
      return;
    await perform(
      () => request(`${page}/${row[pk]}/${a}`, "POST"),
      `Operación ${a === "confirmar" ? "confirmada" : "cancelada"}.`,
    );
  }
  const refTable = (k) =>
    ({
      id_categoria: "categorias",
      id_producto: "productos",
      id_proveedor: "proveedores",
      id_cliente: "clientes",
      id_empleado: "empleados",
    })[k];
  function field(k, t) {
    const value = form[k] ?? "";
    const props = {
      id: k,
      name: k,
      "aria-label": title(k),
      value,
      onChange: (e) => setForm({ ...form, [k]: e.target.value }),
      required: !["optional", "email"].includes(t),
    };
    if (t === "id")
      return (
        <select {...props}>
          <option value="">Seleccione…</option>
          {(lookups[refTable(k)] || []).map((r) => (
            <option key={r[k]} value={r[k]}>
              {r.nombre} {r.apellido || ""} (#{r[k]})
            </option>
          ))}
        </select>
      );
    if (t === "active" || t === "movement")
      return (
        <select {...props}>
          {(t === "active"
            ? ["activo", "inactivo"]
            : ["entrada", "salida"]
          ).map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      );
    return (
      <input
        {...props}
        type={
          t === "date"
            ? "date"
            : t === "email"
              ? "email"
              : ["money", "quantity"].includes(t)
                ? "number"
                : "text"
        }
        min={
          ["money", "quantity"].includes(t)
            ? movement && k === "cantidad"
              ? 1
              : 0
            : undefined
        }
        max={
          t === "quantity" ? 1000000 : t === "money" ? 9999999999.99 : undefined
        }
        maxLength={t === "text" ? 120 : 255}
        step={t === "money" ? "0.01" : t === "quantity" ? "1" : undefined}
      />
    );
  }
  async function exportFile(path, filename) {
    const view = viewVersion.current;
    setBusy(true);
    setError("");
    try {
      await downloadCSV(path, filename);
      if (viewVersion.current === view) setNotice("Archivo CSV descargado.");
    } catch (e) {
      if (viewVersion.current === view) setError(e.message);
    } finally {
      if (viewVersion.current === view) setBusy(false);
    }
  }
  async function showReceipt(row) {
    const view = viewVersion.current,
      version = ++editVersion.current;
    editController.current?.abort();
    const controller = new AbortController();
    editController.current = controller;
    const current = () =>
      viewVersion.current === view &&
      editVersion.current === version &&
      !controller.signal.aborted;
    setBusy(true);
    setError("");
    try {
      const value = await request(
        `ventas/${row.id_venta}/comprobante`,
        "GET",
        undefined,
        controller.signal,
      );
      if (current()) {
        setReceipt(value);
        setForm(null);
      }
    } catch (e) {
      if (current() && e.name !== "AbortError") setError(e.message);
    } finally {
      if (current()) setBusy(false);
      if (editController.current === controller) editController.current = null;
    }
  }
  function setListFilter(setter, value) {
    setPageNumber(1);
    setter(value);
  }
  const visible = data;
  const relationshipColumns = {
    id_categoria: "categoria_nombre",
    id_proveedor: "proveedor_nombre",
    id_cliente: "cliente_nombre",
    id_empleado: "empleado_nombre",
    id_producto: "producto_nombre",
  };
  const columnNames = {
    categoria_nombre: "Categoría",
    proveedor_nombre: "Proveedor",
    cliente_nombre: "Cliente",
    empleado_nombre: "Empleado",
    producto_nombre: "Producto",
  };
  const rawColumns = meta[page]
    ? [
        pk,
        ...Object.keys(meta[page].fields),
        ...(page === "productos" ? ["stock"] : []),
      ]
    : trade
      ? [
          pk,
          page === "compras" ? "id_proveedor" : "id_cliente",
          "id_empleado",
          page === "compras" ? "fecha_compra" : "fecha_venta",
          "total",
          "estado",
        ]
      : [
          "id_movimiento",
          "id_producto",
          "tipo_movimiento",
          "cantidad",
          "fecha_movimiento",
          "descripcion",
        ];
  const columns = rawColumns.map((k) =>
    k === pk ? k : relationshipColumns[k] || k,
  );
  function cellValue(row, key) {
    if (row[key] !== undefined) return row[key];
    const idKey = Object.keys(relationshipColumns).find(
      (k) => relationshipColumns[k] === key,
    );
    if (!idKey) return row[key];
    const related = (lookups[refTable(idKey)] || []).find(
      (r) => r[idKey] === row[idKey],
    );
    return related ? `${related.nombre} ${related.apellido || ""}`.trim() : "—";
  }
  const price = page === "compras" ? "costo_unitario" : "precio_unitario";
  return (
    <div className={"shell" + (receipt ? " showing-receipt" : "")}>
      <aside>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("dashboard");
          }}
        >
          <span className="logo">N</span>
          <span>
            NovaObra<small>CONTROL ADMINISTRATIVO</small>
          </span>
        </a>
        <p className="nav-caption">ESPACIO DE TRABAJO</p>
        <nav>
          {Object.entries(labels).map(([key, label], i) => (
            <button
              className={page === key ? "selected" : ""}
              key={key}
              onClick={() => navigate(key)}
            >
              <span className="nav-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              {label}
            </button>
          ))}
        </nav>
        <div className="aside-footer">
          Ferretería NovaObra
          <br />
          <small>Aplicación académica local</small>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <p className="eyebrow">GESTIÓN DE FERRETERÍA</p>
            <h1>{labels[page]}</h1>
          </div>
          <button
            className="secondary"
            disabled={loading || busy}
            onClick={load}
          >
            Actualizar
          </button>
        </header>
        <p className="intro">
          {page === "dashboard"
            ? "Una visión clara de tu negocio, en un solo lugar."
            : `Administra ${labels[page].toLowerCase()} y consulta tus registros.`}
        </p>
        {error && (
          <div className="alert error" role="alert">
            {error}{" "}
            <button onClick={() => setError("")} aria-label="Cerrar error">
              ×
            </button>
          </div>
        )}
        {notice && (
          <div className="alert success" role="status">
            {notice}
          </div>
        )}
        {loading && (
          <div className="loading-line" role="status">
            Cargando información…
          </div>
        )}
        {page === "dashboard" ? (
          dashboard && (
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
                  Entradas y salidas registradas, incluidos los ajustes
                  compensatorios.
                </p>
                {dashboard.movimientos.length ? (
                  <div className="activity">
                    {dashboard.movimientos.map((m) => (
                      <div key={m.tipo_movimiento}>
                        <span className="badge">
                          {title(m.tipo_movimiento)}
                        </span>
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
                  exportFile(
                    "inventario-bajo/exportar.csv",
                    "NovaObra_Reposicion.csv",
                  )
                }
              />
              <section className="panel">
                <h2>Operaciones del día a día</h2>
                <p>
                  Crea un borrador de compra o venta, agrega sus productos y
                  confírmalo para actualizar el inventario.
                </p>
                <div className="actions">
                  <button onClick={() => navigate("compras")}>
                    Ir a compras
                  </button>
                  <button
                    className="secondary"
                    onClick={() => navigate("ventas")}
                  >
                    Ir a ventas
                  </button>
                </div>
              </section>
            </>
          )
        ) : page === "reportes" ? (
          <ReportsPanel
            data={report}
            range={reportRange}
            onRangeChange={setReportRange}
            loading={loading}
            busy={busy}
            onExport={() =>
              exportFile(
                `reportes/exportar.csv?${reportQuery}`,
                "NovaObra_Reportes.csv",
              )
            }
          />
        ) : (
          <>
            <section className="panel">
              <div className="toolbar">
                <div>
                  <h2>Registros de {labels[page].toLowerCase()}</h2>
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
                    onChange={(e) =>
                      setListFilter(setMovementType, e.target.value)
                    }
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
                        onChange={(e) =>
                          setListFilter(setFromDate, e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Hasta
                      <input
                        aria-label="Hasta"
                        type="date"
                        value={toDate}
                        min={fromDate || undefined}
                        onChange={(e) =>
                          setListFilter(setToDate, e.target.value)
                        }
                      />
                    </label>
                  </>
                )}
              </div>
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
              <div className="pagination">
                <label>
                  Registros por página
                  <select
                    aria-label="Registros por página"
                    value={pageSize}
                    onChange={(e) =>
                      setListFilter(setPageSize, Number(e.target.value))
                    }
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
                    disabled={
                      loading || busy || pageNumber >= pagination.paginas
                    }
                    onClick={() => setPageNumber((n) => n + 1)}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
              {movement && (
                <p className="muted">
                  El historial es inmutable. Para corregir una entrada o salida
                  registra un movimiento compensatorio.
                </p>
              )}
            </section>
          </>
        )}
        {form && (
          <section className="panel editor" aria-labelledby="form-title">
            <div className="toolbar">
              <h2 id="form-title">
                {editing
                  ? `Registro #${editing}`
                  : movement
                    ? "Ajuste de inventario"
                    : "Nuevo registro"}
              </h2>
              <button className="secondary" onClick={() => setForm(null)}>
                Cerrar
              </button>
            </div>
            <form onSubmit={save}>
              <fieldset
                disabled={
                  busy ||
                  (trade &&
                    data.find((r) => r[pk] === editing)?.estado !==
                      "borrador" &&
                    editing !== null)
                }
              >
                <div className="form-grid">
                  {Object.entries(fields).map(([k, t]) => (
                    <label key={k} htmlFor={k}>
                      {title(k)}
                      {field(k, t)}
                    </label>
                  ))}
                </div>
                {trade && (
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
                                [price]: p
                                  ? p[
                                      page === "compras"
                                        ? "precio_compra"
                                        : "precio_venta"
                                    ]
                                  : 0,
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
                                  j === i
                                    ? { ...x, cantidad: e.target.value }
                                    : x,
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
                                  j === i
                                    ? { ...x, [price]: e.target.value }
                                    : x,
                                ),
                              )
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() =>
                            setLines(lines.filter((_, j) => j !== i))
                          }
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                    <button
                      className="secondary"
                      type="button"
                      onClick={() =>
                        setLines([
                          ...lines,
                          { id_producto: "", cantidad: 1, [price]: 0 },
                        ])
                      }
                    >
                      Agregar producto
                    </button>
                    <p className="trade-total">
                      Total:{" "}
                      {money(
                        lines.reduce(
                          (s, l) =>
                            s +
                            Math.round(Number(l[price]) * 100) *
                              Number(l.cantidad),
                          0,
                        ) / 100,
                      )}
                    </p>
                  </div>
                )}
                <button disabled={busy} type="submit">
                  {busy ? "Guardando…" : "Guardar" + (trade ? " borrador" : "")}
                </button>
              </fieldset>
            </form>
          </section>
        )}
        {receipt && <Receipt data={receipt} onClose={() => setReceipt(null)} />}
        <footer>NovaObra Control · Herramientas para administrar mejor.</footer>
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
