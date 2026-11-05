import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useShop } from "../context/ShopContext.jsx";
import { useData } from "../hooks/useData.js";
import { api, money } from "../services/api.js";
import { Feedback, Meta, PageHeading, Empty } from "../components/UI.jsx";
import {Icon,AuthShell} from '../components/Visuals.jsx';
import GoogleSignIn,{GoogleAccountConnection} from '../components/GoogleSignIn.jsx';
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
  const { user, setUser, authReady, logout, authError, cart, favorites } = useShop(),
    [register, setRegister] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [googleAccess,setGoogleAccess]=useState(null),
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
  if(!authReady)return <div className="container section"><Feedback loading/></div>;
  if(!user)return <AuthShell register={register}><Meta title="Mi cuenta"/><Feedback error={error||authError}/><GoogleSignIn/>
          <form className="auth-fields" onSubmit={submit}>
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
  </AuthShell>;
  const list=orders.data||[],initials=user.nombre.split(' ').filter(Boolean).slice(0,2).map(word=>word[0]).join('').toUpperCase();
  const count=orders.data?list.filter(order=>order.tipo==='pedido').length:'—',quotes=orders.data?list.filter(o=>o.tipo==='cotizacion').length:'—';
  const pending=orders.data?list.filter(o=>!['entregado','cancelado'].includes(o.estado)&&!(o.tipo==='cotizacion'&&o.estado==='confirmado')).length:null;
  return <div className="container section account-page"><Meta title="Mi cuenta"/>
    <div className="account-layout">
      <aside className="account-sidebar">
        <div className="account-profile"><span className="account-avatar">{initials}</span><strong>{user.nombre}</strong><span>{user.correo||user.email}</span><small><Icon name="shield" size={13}/>{user.rol==='cliente'?'Cuenta de cliente':user.rol}</small></div>
        <nav aria-label="Mi cuenta"><a href="#account-overview"><Icon name="grid" size={19}/>Resumen de mi cuenta</a><a href="#account-orders"><Icon name="box" size={19}/>Pedidos y cotizaciones</a><Link to="/favoritos"><Icon name="list" size={19}/>Mis favoritos <b>{favorites.length}</b></Link><Link to="/carrito"><Icon name="box" size={19}/>Mi carrito <b>{cart.reduce((sum,item)=>sum+item.cantidad,0)}</b></Link><a href="#account-security"><Icon name="shield" size={19}/>Seguridad</a>{user.rol!=='cliente'&&<Link to="/admin"><Icon name="grid" size={19}/>Administración</Link>}</nav>
        <button className="account-logout secondary" disabled={busy} onClick={async()=>{setBusy(true);try{await logout();}catch(e){setError(e.message);}finally{setBusy(false);}}}>Cerrar sesión <Icon name="arrow" size={17}/></button>
      </aside>
      <div className="account-main">
        <header id="account-overview" className="account-welcome"><div><span className="eyebrow">TU ESPACIO NOVAOBRA</span><h1>Hola, {user.nombre}</h1><p>Organiza tus compras, guarda tus ideas y prepara tu próximo proyecto.</p></div><Link className="button" to="/catalogo">Explorar catálogo <Icon name="arrow" size={18}/></Link></header>
        <Feedback error={error||authError}/>
        <div className="account-stats">{[['Pedidos',count,'box'],['Cotizaciones',quotes,'list'],['Favoritos',favorites.length,'list'],['En el carrito',cart.reduce((sum,item)=>sum+item.cantidad,0),'box']].map(([label,value,icon])=><div key={label}><span className="account-stat-icon"><Icon name={icon}/></span><strong>{value}</strong><span>{label}</span></div>)}</div>
        <section className="account-orders" id="account-orders"><div className="account-section-title"><div><span className="eyebrow">EL AVANCE DE TUS PROYECTOS</span><h2>Mis pedidos y cotizaciones</h2></div>{pending!==null&&<span className="account-pending">{pending} en curso</span>}</div><Feedback {...orders}/>
        {list.length?<OrderList orders={list}/>:orders.data&&<div className="account-empty"><div className="account-empty-icon"><Icon name="box" size={40}/></div><div><h3>Todo listo para tu primer proyecto</h3><p>Aún no tienes pedidos. Explora herramientas y materiales, prepara tu carrito y elige entre un pedido o una cotización.</p><Link className="button" to="/catalogo">Visita el catálogo <Icon name="arrow" size={17}/></Link></div></div>}
        </section>
        <section className="account-shortcuts"><Link to="/catalogo"><Icon name="tool"/><div><h3>Encuentra lo que necesitas</h3><p>Consulta precios, descripciones y existencias.</p></div><Icon name="arrow" size={17}/></Link><Link to="/contacto"><Icon name="user"/><div><h3>Prepara tu consulta</h3><p>Encuentra los canales de contacto de la tienda.</p></div><Icon name="arrow" size={17}/></Link></section>
        <GoogleAccountConnection onStatus={setGoogleAccess}/>
        {googleAccess?.localPassword!==false&&<details id="account-security" className="panel password-panel"><summary><Icon name="shield" size={20}/>Cambiar contraseña</summary><p className="muted">Al actualizarla se cerrarán las sesiones actuales. Después podrás entrar con tu nueva contraseña.</p><form onSubmit={changePassword}><div className="two-columns"><label>Contraseña actual<input type="password" name="actual" required autoComplete="current-password"/></label><label>Contraseña nueva<input type="password" name="nueva" minLength={8} maxLength={128} required autoComplete="new-password"/></label></div><button disabled={busy}>Actualizar contraseña</button></form></details>}
      </div>
    </div>
  </div>;
}
