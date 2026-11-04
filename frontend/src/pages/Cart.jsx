import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useShop } from "../context/ShopContext.jsx";
import { useData } from "../hooks/useData.js";
import { api, money, productPath } from "../lib/api.js";
import { Feedback, Meta, PageHeading, Empty } from "../components/UI.jsx";
export default function Cart() {
  const { cart, setCart, user } = useShop(),
    { data: config } = useData("/config"),
    navigate = useNavigate();
  const [products, setProducts] = useState({}),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [delivery, setDelivery] = useState("retiro"),
    [success, setSuccess] = useState(null);
  const key = useRef(crypto.randomUUID()),
    cartKey = JSON.stringify(cart);
  useEffect(() => {
    key.current = crypto.randomUUID();
  }, [cartKey]);
  useEffect(() => {
    const c = new AbortController();
    let timer;
    setLoading(true);
    async function load() {
      try {
        const rows = await Promise.all(
          cart.map(async (item) => {
            try {
              return await api(`/productos/${item.id}`, { signal: c.signal });
            } catch (e) {
              if (e.status === 404) return { id: item.id, missing: true };
              throw e;
            }
          }),
        );
        if (!c.signal.aborted) {
          setProducts(Object.fromEntries(rows.map((p) => [p.id, p])));
          setError("");
        }
      } catch (e) {
        if (!c.signal.aborted) setError(e.message);
      } finally {
        if (!c.signal.aborted) {
          setLoading(false);
          timer = setTimeout(load, 30000);
        }
      }
    }
    load();
    return () => {
      c.abort();
      clearTimeout(timer);
    };
  }, [cartKey]);
  const subtotal =
    cart.reduce(
      (sum, item) =>
        sum +
        Math.round((products[item.id]?.precio_actual || 0) * 100) *
          item.cantidad,
      0,
    ) / 100;
  const fee = delivery === "domicilio" ? config?.deliveryFee || 0 : 0;
  const unavailable = cart.some(
    (item) => !products[item.id] || products[item.id].missing,
  );
  async function submit(event) {
    event.preventDefault();
    if (!user) {
      navigate("/cuenta?volver=carrito");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const form = Object.fromEntries(new FormData(event.currentTarget));
      const result = await api("/pedidos", {
        method: "POST",
        body: {
          ...form,
          clave: key.current,
          lineas: cart.map((item) => ({
            producto_id: item.id,
            cantidad: item.cantidad,
          })),
        },
      });
      setSuccess(result.id);
      setCart([]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container section">
      <Meta title="Mi carrito" />
      <PageHeading eyebrow="TU PRÓXIMO PROYECTO" title="Mi carrito" />
      <Feedback error={error} loading={loading && cart.length > 0} />
      {success ? (
        <div className="success" role="status">
          <h2>Solicitud #{success} registrada</h2>
          <p>
            La tienda revisará tu solicitud. No se ha realizado ningún cobro en
            línea.
          </p>
          <Link className="button" to="/cuenta">
            Consultar mis pedidos
          </Link>
        </div>
      ) : !cart.length ? (
        <Empty>
          Tu carrito está vacío.{" "}
          <Link to="/catalogo">Explora nuestros productos.</Link>
        </Empty>
      ) : (
        <div className="cart-layout">
          <div>
            {cart.map((item) => {
              const p = products[item.id];
              return (
                <article className="cart-item" key={item.id}>
                  <div>
                    <h2>
                      {p && !p.missing ? (
                        <Link to={productPath(p)}>{p.nombre}</Link>
                      ) : p?.missing ? (
                        "Producto no disponible"
                      ) : (
                        "Cargando producto…"
                      )}
                    </h2>
                    <p>
                      {p && !p.missing
                        ? `${money(p.precio_actual)} por unidad · ${p.existencia} disponibles`
                        : ""}
                    </p>
                  </div>
                  <label>
                    Cantidad
                    <input
                      aria-label={`Cantidad de ${p?.nombre || item.id}`}
                      type="number"
                      min="1"
                      max="10000"
                      value={item.cantidad}
                      disabled={busy}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (
                          Number.isInteger(value) &&
                          value > 0 &&
                          value <= 10000
                        )
                          setCart((old) =>
                            old.map((x) =>
                              x.id === item.id ? { ...x, cantidad: value } : x,
                            ),
                          );
                      }}
                    />
                  </label>
                  <strong>
                    {money((p?.precio_actual || 0) * item.cantidad)}
                  </strong>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() =>
                      setCart((old) => old.filter((x) => x.id !== item.id))
                    }
                    aria-label={`Eliminar ${p?.nombre || item.id}`}
                  >
                    Eliminar
                  </button>
                </article>
              );
            })}
            <p className="muted">
              Los precios y las existencias se verifican de nuevo al enviar. Una
              cotización no reserva inventario.
            </p>
            <Link to="/catalogo">← Seguir explorando</Link>
          </div>
          <form className="checkout panel" onSubmit={submit}>
            <h2>Resumen del pedido</h2>
            <div className="summary-line">
              <span>Productos</span>
              <strong>{money(subtotal)}</strong>
            </div>
            <div className="summary-line">
              <span>Entrega</span>
              <strong>{money(fee)}</strong>
            </div>
            <div className="summary-line total">
              <span>Total</span>
              <strong>{money(subtotal + fee)}</strong>
            </div>
            <fieldset disabled={busy}>
              <label>
                Tipo de solicitud
                <select name="tipo">
                  <option value="pedido">Pedido</option>
                  <option value="cotizacion">Solicitud de cotización</option>
                </select>
              </label>
              <label>
                Forma de entrega
                <select
                  name="entrega"
                  value={delivery}
                  onChange={(e) => setDelivery(e.target.value)}
                >
                  <option value="retiro">Retiro en tienda</option>
                  {config?.deliveryFee !== null &&
                    config?.deliveryFee !== undefined && (
                      <option value="domicilio">Entrega a domicilio</option>
                    )}
                </select>
              </label>
              {delivery === "domicilio" && (
                <label>
                  Dirección de entrega
                  <textarea name="direccion" required maxLength={500} />
                </label>
              )}
              <label>
                Teléfono de contacto
                <input
                  name="telefono"
                  type="tel"
                  required
                  maxLength={30}
                  autoComplete="tel"
                />
              </label>
              <label>
                Notas para la tienda
                <textarea name="nota" maxLength={1000} />
              </label>
              <p className="muted">
                Pago por acordar con la tienda. No ingreses datos de tarjetas.
              </p>
              <button
                disabled={
                  loading ||
                  unavailable ||
                  busy ||
                  !config ||
                  (user && user.rol !== "cliente")
                }
              >
                {busy
                  ? "Enviando…"
                  : user
                    ? "Enviar solicitud"
                    : "Iniciar sesión para continuar"}
              </button>
              {user && user.rol !== "cliente" && (
                <p>Para comprar, utiliza una cuenta de cliente.</p>
              )}
            </fieldset>
          </form>
        </div>
      )}
    </div>
  );
}
