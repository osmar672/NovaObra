import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useShop } from "../context/ShopContext.jsx";
import { useData } from "../hooks/useData.js";
import { api, money } from "../lib/api.js";
import { Feedback, Meta, PageHeading, Empty } from "../components/UI.jsx";
import { OrderList } from "./Account.jsx";
function useMutation(reload) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  return {
    busy,
    error,
    message,
    run: async (path, method, body) => {
      setBusy(true);
      setError("");
      setMessage("");
      try {
        await api(path, { method, body });
        setMessage("Cambios guardados.");
        reload();
        return true;
      } catch (e) {
        setError(e.message);
        return false;
      } finally {
        setBusy(false);
      }
    },
  };
}
function MutationFeedback({ mutation }) {
  return (
    <>
      <Feedback error={mutation.error} />
      {mutation.message && (
        <p role="status" className="success">
          {mutation.message}
        </p>
      )}
    </>
  );
}
function Dashboard() {
  const state = useData("/admin/dashboard", { poll: true });
  return (
    <>
      <Feedback {...state} />
      {state.data && (
        <>
          <div className="stats-grid">
            {[
              ["Ventas entregadas", money(state.data.ventas)],
              ["Pedidos pendientes", state.data.pendientes],
              ["Productos activos", state.data.productos],
              ["Alertas de inventario", state.data.bajos],
            ].map(([label, value]) => (
              <div className="panel" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className="two-columns">
            <div className="panel">
              <h2>Productos más vendidos</h2>
              {state.data.top.map((p, i) => (
                <p key={i}>
                  {p.nombre} · {p.unidades} unidades · {money(p.total)}
                </p>
              ))}
              {!state.data.top.length && <p>Aún no hay pedidos entregados.</p>}
            </div>
            <div className="panel">
              <h2>Inventario bajo</h2>
              {state.data.bajoInventario.map((p) => (
                <p key={p.id}>
                  {p.nombre}: <strong>{p.existencia}</strong> (mínimo {p.minimo}
                  )
                </p>
              ))}
              {!state.data.bajoInventario.length && (
                <p>No hay alertas de inventario.</p>
              )}
            </div>
          </div>
          <p className="muted">
            Ventas: importe de productos en pedidos entregados, sin gastos de
            entrega. No incluye cotizaciones ni cancelaciones.
          </p>
        </>
      )}
    </>
  );
}
function ProductEditor({
  product,
  categories,
  brands,
  onSave,
  busy,
  onCancel,
}) {
  const iso = (value) =>
    value ? new Date(value).toISOString().slice(0, 16) : "";
  async function submit(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    data.activo = data.activo === "on";
    data.destacado = data.destacado === "on";
    if (data.precio_oferta) {
      if (!data.oferta_inicio || !data.oferta_fin) {
        alert("Completa el inicio y el fin de la promoción.");
        e.currentTarget.querySelector("[name=oferta_inicio]").focus();
        return;
      }
      data.oferta_inicio = new Date(data.oferta_inicio + "Z").toISOString();
      data.oferta_fin = new Date(data.oferta_fin + "Z").toISOString();
    }
    await onSave(data);
  }
  return (
    <form className="panel editor" onSubmit={submit}>
      <h2>{product ? "Editar producto" : "Nuevo producto"}</h2>
      <fieldset disabled={busy}>
        <div className="two-columns">
          <label>
            Nombre
            <input
              name="nombre"
              required
              maxLength={160}
              defaultValue={product?.nombre}
            />
          </label>
          <label>
            SKU
            <input
              name="sku"
              required
              maxLength={60}
              defaultValue={product?.sku}
            />
          </label>
          <label>
            Categoría
            <select
              aria-label="Categoría"
              name="categoria_id"
              required
              defaultValue={product?.categoria_id || ""}
            >
              <option value="">Selecciona</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                  {!c.activo ? " (inactiva)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            Marca
            <select
              aria-label="Marca"
              name="marca_id"
              required
              defaultValue={product?.marca_id || ""}
            >
              <option value="">Selecciona</option>
              {brands.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                  {!c.activo ? " (inactiva)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            Precio en colones
            <input
              name="precio"
              required
              type="number"
              min="0.01"
              max="99999999.99"
              step="0.01"
              defaultValue={product?.precio}
            />
          </label>
          <label>
            Alerta de stock mínimo
            <input
              name="minimo"
              required
              type="number"
              min="0"
              max="1000000"
              defaultValue={product?.minimo ?? 5}
            />
          </label>
        </div>
        <label>
          Descripción
          <textarea
            name="descripcion"
            maxLength={10000}
            defaultValue={product?.descripcion}
          />
        </label>
        <label>
          Especificaciones técnicas
          <textarea
            name="especificaciones"
            maxLength={10000}
            defaultValue={product?.especificaciones}
          />
        </label>
        <label>
          Imagen del producto (URL HTTPS)
          <input
            type="url"
            name="imagen"
            maxLength={1000}
            defaultValue={product?.imagen}
            placeholder="https://…"
          />
        </label>
        <details open={!!product?.precio_oferta}>
          <summary>Promoción por tiempo limitado</summary>
          <p>
            Fechas en UTC. Costa Rica corresponde a UTC−6. Deja el precio de
            oferta vacío para quitar la promoción.
          </p>
          <div className="two-columns">
            <label>
              Precio de oferta
              <input
                name="precio_oferta"
                type="number"
                min="0.01"
                max="99999999.99"
                step="0.01"
                defaultValue={product?.precio_oferta}
              />
            </label>
            <label>
              Inicio (UTC)
              <input
                name="oferta_inicio"
                type="datetime-local"
                defaultValue={iso(product?.oferta_inicio)}
              />
            </label>
            <label>
              Fin (UTC)
              <input
                name="oferta_fin"
                type="datetime-local"
                defaultValue={iso(product?.oferta_fin)}
              />
            </label>
          </div>
        </details>
        <div className="button-row">
          <label className="check">
            <input
              type="checkbox"
              name="activo"
              defaultChecked={product ? !!product.activo : true}
            />
            Activo
          </label>
          <label className="check">
            <input
              type="checkbox"
              name="destacado"
              defaultChecked={!!product?.destacado}
            />
            Destacado
          </label>
        </div>
        <p className="muted">
          El stock se modifica desde Inventario para conservar el historial de
          movimientos.
        </p>
        <div className="button-row">
          <button>{busy ? "Guardando…" : "Guardar producto"}</button>
          <button type="button" className="secondary" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </fieldset>
    </form>
  );
}
function Products() {
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [edit, setEdit] = useState(undefined),
    state = useData(
      `/admin/productos?q=${encodeURIComponent(search)}&pagina=${page}`,
    ),
    cats = useData("/admin/categorias"),
    brands = useData("/admin/marcas"),
    mutation = useMutation(state.reload);
  return (
    <>
      <div className="section-heading">
        <h2>Productos y precios</h2>
        <button onClick={() => setEdit(null)}>Nuevo producto</button>
      </div>
      <MutationFeedback mutation={mutation} />
      {edit !== undefined && (
        <ProductEditor
          key={edit?.id || "new"}
          product={edit}
          categories={cats.data || []}
          brands={brands.data || []}
          busy={mutation.busy}
          onCancel={() => setEdit(undefined)}
          onSave={async (body) => {
            if (
              await mutation.run(
                `/admin/productos${edit ? "/" + edit.id : ""}`,
                edit ? "PUT" : "POST",
                body,
              )
            )
              setEdit(undefined);
          }}
        />
      )}
      <label>
        Buscar productos para administrar
        <input
          value={search}
          maxLength={100}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </label>
      <Feedback {...state} />
      <Feedback error={cats.error || brands.error} />
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>SKU</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {state.data?.items.map((p) => (
              <tr key={p.id}>
                <td>{p.nombre}</td>
                <td>{p.sku}</td>
                <td>{money(p.precio_actual)}</td>
                <td>{p.existencia}</td>
                <td>{p.activo ? "Activo" : "Inactivo"}</td>
                <td>
                  <button className="secondary" onClick={() => setEdit(p)}>
                    Editar {p.sku}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {state.data?.paginas > 1 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>
            Anterior
          </button>
          <span>Página {page}</span>
          <button
            disabled={page >= state.data.paginas}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
          </button>
        </div>
      )}
    </>
  );
}
function Taxonomy({ resource }) {
  const state = useData(`/admin/${resource}`),
    [edit, setEdit] = useState(null),
    mutation = useMutation(state.reload);
  return (
    <>
      <h2>{resource === "categorias" ? "Categorías" : "Marcas"}</h2>
      <MutationFeedback mutation={mutation} />
      <form
        className="panel"
        key={edit?.id || "new"}
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget,
            body = Object.fromEntries(new FormData(form));
          body.activo = body.activo === "on";
          if (
            await mutation.run(
              `/admin/${resource}${edit ? "/" + edit.id : ""}`,
              edit ? "PUT" : "POST",
              body,
            )
          ) {
            setEdit(null);
            form.reset();
          }
        }}
      >
        <h3>{edit ? "Editar registro" : "Nuevo registro"}</h3>
        <label>
          Nombre
          <input
            name="nombre"
            required
            maxLength={100}
            defaultValue={edit?.nombre}
          />
        </label>
        <label>
          Descripción
          <textarea
            name="descripcion"
            maxLength={500}
            defaultValue={edit?.descripcion}
          />
        </label>
        <label className="check">
          <input
            type="checkbox"
            name="activo"
            defaultChecked={edit ? !!edit.activo : true}
          />{" "}
          Activo
        </label>
        <div className="button-row">
          <button disabled={mutation.busy}>Guardar</button>
          {edit && (
            <button
              type="button"
              className="secondary"
              onClick={() => setEdit(null)}
            >
              Cancelar edición
            </button>
          )}
        </div>
      </form>
      <Feedback {...state} />
      <div className="admin-records">
        {state.data?.map((item) => (
          <div className="panel section-heading" key={item.id}>
            <span>
              {item.nombre} · {item.activo ? "Activo" : "Inactivo"}
            </span>
            <button className="secondary" onClick={() => setEdit(item)}>
              Editar {item.nombre}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
function nextStates(order) {
  if (order.tipo === "cotizacion")
    return order.estado === "pendiente" ? ["confirmado", "cancelado"] : [];
  return (
    {
      pendiente: ["confirmado", "cancelado"],
      confirmado: ["preparando", "cancelado"],
      preparando: [
        order.entrega === "retiro" ? "listo" : "enviado",
        "cancelado",
      ],
      listo: ["entregado", "cancelado"],
      enviado: ["entregado"],
    }[order.estado] || []
  );
}
function Orders() {
  const state = useData("/admin/pedidos", { poll: true }),
    mutation = useMutation(state.reload);
  return (
    <>
      <h2>Pedidos y cotizaciones</h2>
      <p>
        Las cotizaciones confirmadas son propuestas atendidas; no reservan
        inventario ni cuentan como ventas.
      </p>
      <MutationFeedback mutation={mutation} />
      <Feedback {...state} />
      {state.data?.map((order) => (
        <section className="admin-order" key={order.id}>
          <OrderList orders={[order]} />
          <p>
            Cliente: {order.cliente} · {order.email} · {order.telefono}
          </p>
          {order.direccion && <p>{order.direccion}</p>}
          <div className="button-row">
            {nextStates(order).map((status) => (
              <button
                className={status === "cancelado" ? "danger" : "secondary"}
                disabled={mutation.busy}
                key={status}
                onClick={() => {
                  if (
                    confirm(`¿Cambiar la solicitud #${order.id} a «${status}»?`)
                  )
                    mutation.run(`/admin/pedidos/${order.id}`, "PATCH", {
                      estado: status,
                    });
                }}
              >
                {status}
              </button>
            ))}
          </div>
        </section>
      ))}
      {state.data && !state.data.length && <Empty>No hay solicitudes.</Empty>}
      <p className="muted">Se muestran las 200 solicitudes más recientes.</p>
    </>
  );
}
function Inventory() {
  const state = useData("/admin/inventario"),
    [search, setSearch] = useState(""),
    products = useData(`/admin/productos?q=${encodeURIComponent(search)}`),
    mutation = useMutation(() => {
      state.reload();
      products.reload();
    });
  return (
    <>
      <h2>Entradas y salidas de inventario</h2>
      <MutationFeedback mutation={mutation} />
      <form
        className="panel"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          if (
            await mutation.run(
              "/admin/inventario",
              "POST",
              Object.fromEntries(new FormData(form)),
            )
          )
            form.reset();
        }}
      >
        <label>
          Buscar producto
          <input
            value={search}
            maxLength={100}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label>
          Producto
          <select aria-label="Producto" name="producto_id" required>
            <option value="">Selecciona un producto</option>
            {products.data?.items.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} · {p.nombre} · Stock: {p.existencia}
              </option>
            ))}
          </select>
        </label>
        <p className="muted">
          Se muestran hasta 12 coincidencias. Busca por nombre o SKU para
          localizar el producto.
        </p>
        <div className="two-columns">
          <label>
            Cantidad (+ entrada / − salida)
            <input
              name="cantidad"
              type="number"
              min="-100000"
              max="100000"
              required
            />
          </label>
          <label>
            Motivo
            <input name="motivo" maxLength={200} required />
          </label>
        </div>
        <button disabled={mutation.busy}>Registrar movimiento</button>
      </form>
      <Feedback {...state} />
      <Feedback error={products.error} />
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Motivo</th>
              <th>Responsable</th>
            </tr>
          </thead>
          <tbody>
            {state.data?.map((row) => (
              <tr key={row.id}>
                <td>{new Date(row.creado).toLocaleString("es-CR")}</td>
                <td>{row.nombre}</td>
                <td>{row.cantidad}</td>
                <td>{row.motivo}</td>
                <td>{row.responsable}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted">
        Los movimientos no se editan ni se borran. Para corregirlos, registra un
        movimiento compensatorio. Se muestran los últimos 200.
      </p>
    </>
  );
}
function People({ users = false }) {
  const { user } = useShop(),
    state = useData(`/admin/${users ? "usuarios" : "clientes"}`),
    mutation = useMutation(state.reload);
  return (
    <>
      <h2>{users ? "Usuarios y permisos" : "Clientes"}</h2>
      <MutationFeedback mutation={mutation} />
      <Feedback {...state} />
      <div className="admin-records">
        {state.data?.map((person) => (
          <form
            key={`${person.id}-${person.rol_id}-${person.activo}`}
            className="panel"
            onSubmit={async (e) => {
              e.preventDefault();
              const data = Object.fromEntries(new FormData(e.currentTarget));
              if (confirm(`¿Actualizar el acceso de ${person.nombre}?`))
                await mutation.run(`/admin/usuarios/${person.id}`, "PATCH", {
                  rol_id: Number(data.rol_id),
                  activo: data.activo === "on",
                });
            }}
          >
            <h3>{person.nombre}</h3>
            <p>{person.email}</p>
            {!users && (
              <p>
                {person.telefono}
                <br />
                {person.direccion}
              </p>
            )}
            {users && (
              <fieldset disabled={mutation.busy || person.id === user.id}>
                <label>
                  Rol
                  <select name="rol_id" defaultValue={person.rol_id}>
                    <option value="1">Administrador</option>
                    <option value="2">Empleado</option>
                    <option value="3">Cliente</option>
                  </select>
                </label>
                <label className="check">
                  <input
                    name="activo"
                    type="checkbox"
                    defaultChecked={!!person.activo}
                  />{" "}
                  Acceso activo
                </label>
                <button>Guardar permisos</button>
              </fieldset>
            )}
          </form>
        ))}
      </div>
      <p className="muted">Se muestran los 200 registros más recientes.</p>
    </>
  );
}
export default function Admin() {
  const { user, authReady } = useShop(),
    [tab, setTab] = useState("dashboard");
  if (!authReady) return <Feedback loading />;
  if (!user) return <Navigate to="/cuenta" replace />;
  if (user.rol === "cliente")
    return (
      <div className="container section">
        <h1>Acceso restringido</h1>
        <p>Esta página requiere permisos de empleado o administrador.</p>
        <Link to="/">Volver a la tienda</Link>
      </div>
    );
  const tabs = [
    ["dashboard", "Resumen"],
    ["productos", "Productos"],
    ["categorias", "Categorías"],
    ["marcas", "Marcas"],
    ["inventario", "Inventario"],
    ["pedidos", "Pedidos"],
    ["clientes", "Clientes"],
    ...(user.rol === "administrador" ? [["usuarios", "Usuarios"]] : []),
  ];
  return (
    <div className="container section">
      <Meta title="Administración" />
      <PageHeading
        eyebrow={`PANEL PRIVADO · ${user.rol}`}
        title="Administración"
      />
      <nav className="admin-tabs" aria-label="Administración">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? "" : "secondary"}
            aria-current={tab === key ? "page" : undefined}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>
      <div key={tab}>
        {tab === "dashboard" ? (
          <Dashboard />
        ) : tab === "productos" ? (
          <Products />
        ) : ["categorias", "marcas"].includes(tab) ? (
          <Taxonomy resource={tab} />
        ) : tab === "inventario" ? (
          <Inventory />
        ) : tab === "pedidos" ? (
          <Orders />
        ) : (
          <People users={tab === "usuarios"} />
        )}
      </div>
    </div>
  );
}
