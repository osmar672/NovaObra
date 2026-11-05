import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useShop } from "../context/ShopContext.jsx";
import { useData } from "../hooks/useData.js";
import { api, money } from "../services/api.js";
import { Feedback, Meta, PageHeading, Empty } from "../components/UI.jsx";
export function OrderList({ orders }) {
  return (
    <div className="order-list">
      {orders.map((order) => (
        <article className="panel" key={order.id}>
          <div className="section-heading">
            <h3>
              {order.tipo === "cotizacion" ? "Cotización" : "Pedido"} #
              {order.id}
            </h3>
            <span className="status">{order.estado}</span>
          </div>
          <p>
            {new Date(order.creado).toLocaleString("es-CR")} ·{" "}
            {order.entrega === "retiro"
              ? "Retiro en tienda"
              : "Entrega a domicilio"}
          </p>
          {order.lineas.map((line) => (
            <p key={line.id}>
              {line.cantidad} × {line.nombre}{" "}
              <strong>{money(line.precio_unitario * line.cantidad)}</strong>
            </p>
          ))}
          <p>Entrega: {money(order.costo_entrega)}</p>
          <strong>Total: {money(order.total)}</strong>
          {order.nota && <p className="prewrap">Nota: {order.nota}</p>}
        </article>
      ))}
    </div>
  );
}
export default function Account() {
  const { user, setUser, authReady, logout, authError } = useShop(),
    [register, setRegister] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    navigate = useNavigate(),
    [params] = useSearchParams();
  const orders = useData(user ? "/pedidos" : null, { poll: true });
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = Object.fromEntries(new FormData(event.currentTarget));
      const logged = await api(`/auth/${register ? "registro" : "login"}`, {
        method: "POST",
        body: data,
      });
      setUser(logged.usuario);
      if (params.get("volver") === "carrito") navigate("/carrito");
      else if (logged.usuario.rol !== "cliente") navigate("/admin");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function changePassword(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/auth/password", {
        method: "PUT",
        body: Object.fromEntries(new FormData(event.currentTarget)),
      });
      setUser(null);
      setError("Contraseña actualizada. Inicia sesión de nuevo.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container section">
      <Meta title="Mi cuenta" />
      <PageHeading
        eyebrow="BIENVENIDO A NOVAOBRA"
        title={
          user
            ? `Hola, ${user.nombre}`
            : register
              ? "Crea tu cuenta"
              : "Mi cuenta"
        }
      />
      <Feedback error={error || authError} loading={!authReady} />
      {authReady &&
        (user ? (
          <>
            <div className="button-row">
              {user.rol !== "cliente" && (
                <Link className="button" to="/gestion/categorias">
                  Administración
                </Link>
              )}
              <button
                className="secondary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await logout();
                  } catch (e) {
                    setError(e.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Cerrar sesión
              </button>
            </div>
            <h2>Mis pedidos y cotizaciones</h2>
            <Feedback {...orders} />
            {orders.data?.length ? (
              <OrderList orders={orders.data} />
            ) : (
              orders.data && (
                <Empty>
                  Aún no tienes pedidos.{" "}
                  <Link to="/catalogo">Visita el catálogo.</Link>
                </Empty>
              )
            )}
            <details className="panel password-panel">
              <summary>Cambiar contraseña</summary>
              <form onSubmit={changePassword}>
                <label>
                  Contraseña actual
                  <input
                    type="password"
                    name="actual"
                    required
                    autoComplete="current-password"
                  />
                </label>
                <label>
                  Contraseña nueva
                  <input
                    type="password"
                    name="nueva"
                    minLength={8}
                    maxLength={128}
                    required
                    autoComplete="new-password"
                  />
                </label>
                <button disabled={busy}>Actualizar contraseña</button>
              </form>
            </details>
          </>
        ) : (
          <form className="panel auth-form" onSubmit={submit}>
            {register && (
              <label>
                Nombre completo
                <input
                  name="nombre"
                  required
                  maxLength={120}
                  autoComplete="name"
                />
              </label>
            )}
            <label>
              Correo electrónico
              <input
                name="email"
                type="email"
                required
                maxLength={190}
                autoComplete="email"
              />
            </label>
            <label>
              Contraseña
              <input
                name="password"
                type="password"
                required
                minLength={register ? 8 : 1}
                maxLength={128}
                autoComplete={register ? "new-password" : "current-password"}
              />
            </label>
            {register && (
              <p className="muted">
                Usa al menos 12 caracteres. La cuenta permite consultar tus
                pedidos.
              </p>
            )}
            <button disabled={busy}>
              {busy
                ? "Procesando…"
                : register
                  ? "Crear cuenta"
                  : "Iniciar sesión"}
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setRegister(!register);
                setError("");
              }}
            >
              {register ? "Ya tengo una cuenta" : "Crear una cuenta nueva"}
            </button>
          </form>
        ))}
    </div>
  );
}
