import React, { useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
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
};
const title = (s) =>
  s.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
async function request(path, method = "GET", body) {
  const r = await fetch("/api/" + path, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (r.status === 204) return null;
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Error de conexión.");
  return data;
}
const money = (n) =>
  new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC" }).format(
    n,
  );
function App() {
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
    [requestKey, setRequestKey] = useState("");
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
    setLoading(true);
    setError("");
    try {
      const [metadata, current, ...lists] = await Promise.all([
        request("metadata"),
        request(page === "dashboard" ? "dashboard" : page),
        ...[
          "productos",
          "categorias",
          "proveedores",
          "clientes",
          "empleados",
        ].map((x) => request(x)),
      ]);
      setMeta(metadata);
      if (page === "dashboard") setDashboard(current);
      else setData(current);
      setLookups(
        Object.fromEntries(
          [
            "productos",
            "categorias",
            "proveedores",
            "clientes",
            "empleados",
          ].map((x, i) => [x, lists[i]]),
        ),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page]);
  useEffect(() => {
    load();
  }, [load]);
  function navigate(p) {
    setPage(p);
    setForm(null);
    setEditing(null);
    setSearch("");
    setFilter("todos");
    setNotice("");
  }
  function fresh() {
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
                ? new Date().toISOString().slice(0, 10)
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
    setBusy(true);
    try {
      const full = trade ? await request(`${page}/${row[pk]}`) : row;
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
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function perform(fn, message) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      setNotice(message);
      await load();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
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
  const visible = data.filter(
    (r) =>
      JSON.stringify(r)
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()) &&
      (filter === "todos" || filter === "bajo"
        ? filter !== "bajo" || r.stock <= r.stock_minimo
        : r.estado === filter),
  );
  const columns = data.length
    ? Object.keys(data[0]).filter((k) => k !== "clave_solicitud")
    : [];
  const price = page === "compras" ? "costo_unitario" : "precio_unitario";
  return (
    <div className="shell">
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
        {loading ? (
          <div className="empty" role="status">
            Cargando información…
          </div>
        ) : page === "dashboard" ? (
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
        ) : (
          <>
            <section className="panel">
              <div className="toolbar">
                <div>
                  <h2>Registros de {labels[page].toLowerCase()}</h2>
                  <span className="muted">{visible.length} resultados</span>
                </div>
                <button onClick={fresh} disabled={busy}>
                  + {movement ? "Registrar ajuste" : "Crear registro"}
                </button>
              </div>
              <div className="filters">
                <input
                  aria-label="Buscar registros"
                  placeholder="Buscar en los registros…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {!movement && (
                  <select
                    aria-label="Filtrar registros"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
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
              </div>
              {!visible.length ? (
                <div className="empty">No hay registros para mostrar.</div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        {columns.map((k) => (
                          <th key={k}>{title(k)}</th>
                        ))}
                        {!movement && <th>Acciones</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((r) => (
                        <tr key={r[pk]}>
                          {columns.map((k) => (
                            <td key={k}>
                              {k === "estado" ? (
                                <span className={"badge " + r[k]}>{r[k]}</span>
                              ) : k.includes("precio") || k === "total" ? (
                                money(r[k])
                              ) : (
                                String(r[k] ?? "—")
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
        <footer>NovaObra Control · Herramientas para administrar mejor.</footer>
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
