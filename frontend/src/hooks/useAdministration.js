import { referenceTable } from "../utils/relationships.js";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { localDay, title } from "../utils/format.js";
import { downloadCSV } from "../services/apiClient.js";
import { workspaceService } from "../services/workspaceService.js";
import { entityPages } from "../pages/index.js";

const lookupNames = [
  "productos",
  "categorias",
  "proveedores",
  "clientes",
  "empleados",
];

export default function useAdministration() {
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
  const definition = entityPages[page];
  const service = definition?.service;
  const trade = definition?.kind === "trade",
    movement = definition?.kind === "movement";
  const pk = meta[page]?.pk || definition?.pk;
  const fields = meta[page]?.fields || definition?.fields || {};
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
    const signal = controller.signal;
    setLoading(true);
    setError("");
    if (page === "reportes") setReport(null);
    else if (page !== "dashboard") setData([]);
    try {
      const [metadata, result, stockResult, ...lists] = await Promise.all([
        workspaceService.metadata(signal),
        page === "dashboard"
          ? workspaceService.dashboard(signal)
          : page === "reportes"
            ? workspaceService.report(reportQuery, signal)
            : service.list(listQuery, signal),
        page === "dashboard"
          ? entityPages.productos.service.lowStock(signal)
          : Promise.resolve(null),
        ...lookupNames.map((name) =>
          entityPages[name].service.list("", signal),
        ),
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
        Object.fromEntries(lookupNames.map((name, i) => [name, lists[i]])),
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
      const full = trade ? await service.get(row[pk], controller.signal) : row;
      if (!current()) return;
      setEditing(row[pk]);
      setForm(
        Object.fromEntries(Object.keys(fields).map((k) => [k, full[k] ?? ""])),
      );
      setLines(trade ? service.details.fromRecord(full) : []);
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
    if (trade) body.detalles = service.details.serialize(lines);
    const ok = await perform(
      () => (editing ? service.update(editing, body) : service.create(body)),
      "Registro guardado.",
    );
    if (ok) setForm(null);
  }
  async function remove(row) {
    if (!window.confirm(`¿Eliminar el registro #${row[pk]}?`)) return;
    await perform(() => service.remove(row[pk]), "Registro eliminado.");
  }
  async function action(row, a) {
    if (
      !window.confirm(
        `¿${title(a)} ${page} #${row[pk]}? Esta operación modifica su estado y puede afectar el inventario.`,
      )
    )
      return;
    await perform(
      () => service[a](row[pk]),
      `Operación ${a === "confirmar" ? "confirmada" : "cancelada"}.`,
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
      const value = await entityPages.ventas.service.receipt(
        row.id_venta,
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
  const rawColumns = definition?.columns || [];
  const columns = rawColumns.map((k) =>
    k === pk ? k : relationshipColumns[k] || k,
  );
  function cellValue(row, key) {
    if (row[key] !== undefined) return row[key];
    const idKey = Object.keys(relationshipColumns).find(
      (k) => relationshipColumns[k] === key,
    );
    if (!idKey) return row[key];
    const related = (lookups[referenceTable(idKey)] || []).find(
      (r) => r[idKey] === row[idKey],
    );
    return related ? `${related.nombre} ${related.apellido || ""}`.trim() : "—";
  }
  return {
    page,
    definition,
    meta,
    data,
    dashboard,
    lookups,
    loading,
    busy,
    error,
    notice,
    search,
    filter,
    form,
    editing,
    lines,
    category,
    fromDate,
    toDate,
    movementType,
    pageNumber,
    pageSize,
    pagination,
    lowStock,
    report,
    reportRange,
    receipt,
    trade,
    movement,
    pk,
    fields,
    exportQuery,
    reportQuery,
    visible,
    columns,
    columnNames,
    cellValue,
    load,
    navigate,
    fresh,
    edit,
    save,
    remove,
    action,
    exportFile,
    showReceipt,
    setListFilter,
    setSearch,
    setFilter,
    setCategory,
    setFromDate,
    setToDate,
    setMovementType,
    setPageNumber,
    setPageSize,
    setForm,
    setLines,
    setReportRange,
    setReceipt,
    setError,
  };
}
