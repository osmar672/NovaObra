import React, { useState } from "react";
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useShop } from "../context/ShopContext.jsx";
import { useData } from "../hooks/useData.js";
import {Icon} from './Visuals.jsx';
export default function Layout() {
  const { user, cart, notice } = useShop(),
    [open, setOpen] = useState(false),
    [search, setSearch] = useState(""),
    navigate = useNavigate(),route=useLocation();
  React.useEffect(()=>{setOpen(false);document.querySelector(".departments-menu")?.removeAttribute("open");},[route.pathname,route.search]);
  React.useEffect(()=>{const close=event=>{const menu=document.querySelector(".departments-menu");if(menu&&!menu.contains(event.target))menu.removeAttribute("open");};document.addEventListener("pointerdown",close);return()=>document.removeEventListener("pointerdown",close);},[]);
  const { data: categories } = useData(user ? "/categorias" : null);
  const [suggestionTerm, setSuggestionTerm] = useState("");
  React.useEffect(() => {
    const timer = setTimeout(() => setSuggestionTerm(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const { data: suggestions } = useData(
    user && suggestionTerm.length >= 2
      ? `/productos?q=${encodeURIComponent(suggestionTerm)}`
      : null,
  );
  return (
    <>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <div className="topbar">
        <div className="container">
          Todo para construir, reparar y transformar{" "}
          <span>Precios en colones costarricenses</span>
        </div>
      </div>
      <header className="site-header">
        <div className="container header-main">
          <Link className="brand" to="/" aria-label="NovaObra inicio">
            <span className="brand-mark" aria-hidden="true">
              N
            </span>
            <span>
              NOVA<strong>OBRA</strong>
              <small>FERRETERÍA & CONSTRUCCIÓN</small>
            </span>
          </Link>
          <form
            className="search"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(`/catalogo?q=${encodeURIComponent(search)}`);
              setSuggestionTerm("");
            }}
          >
            <label className="sr-only" htmlFor="global-search">
              Buscar productos
            </label>
            <input
              id="global-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Herramientas, materiales, marcas…"
              maxLength={100}
              autoComplete="off"
              list="product-suggestions"
            />
            <datalist id="product-suggestions">
              {suggestions?.items.slice(0, 6).map((p) => (
                <option key={p.id} value={p.nombre} />
              ))}
            </datalist>
            <button aria-label="Buscar" type="submit">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  cx="10"
                  cy="10"
                  r="6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path d="m15 15 6 6" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
          </form>
          <div className="header-actions">
            <Link to="/cuenta">
              <Icon name="user" size={18}/>{user ? user.nombre.split(" ")[0] : "Mi cuenta"}
            </Link>
            <Link to="/carrito" className="cart-link">
              <Icon name="box" size={18}/> Carrito <b>{cart.reduce((sum, x) => sum + x.cantidad, 0)}</b>
            </Link>
            <button
              className="menu-toggle"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-controls="main-nav"
            >
              Menú
            </button>
          </div>
        </div>
        <nav
          id="main-nav"
          className={`main-nav ${open ? "open" : ""}`}
          aria-label="Principal"
          onClick={event=>{if(event.target.closest("a"))setOpen(false);}}
        >
          <div className="container">
            <NavLink to="/" end>
              <Icon name="grid" size={16}/> Inicio
            </NavLink>
            <NavLink to="/catalogo"><Icon name="tool" size={16}/> Catálogo</NavLink>
            <details className="departments-menu" onKeyDown={event=>{if(event.key==="Escape"){event.currentTarget.removeAttribute("open");event.currentTarget.querySelector("summary")?.focus();}}}><summary><Icon name="grid" size={17}/> Departamentos <span aria-hidden="true">⌄</span></summary><div className="departments-dropdown"><strong>Encuentra tu departamento</strong>{categories?.length?categories.map(c=><Link key={c.id} to={`/catalogo?categoria=${c.id}`} onClick={event=>event.currentTarget.closest('details').removeAttribute('open')}>{c.nombre}<Icon name="arrow" size={15}/></Link>):<Link to="/catalogo">Explorar herramientas y materiales <Icon name="arrow" size={15}/></Link>}</div></details>
            <NavLink to="/ofertas"><Icon name="box" size={16}/> Ofertas</NavLink>
            <NavLink to="/nosotros">Nosotros</NavLink>
            <NavLink to="/contacto">Contacto</NavLink>
            {user&&user.rol!=="cliente"&&<NavLink className="nav-admin" to="/admin"><Icon name="grid" size={15}/> Panel de administración</NavLink>}
            <NavLink className="mobile-account" to="/cuenta">Mi cuenta</NavLink>
          </div>
        </nav>
      </header>
      {notice && (
        <div role="status" className="toast">
          {notice}
        </div>
      )}
      <main id="contenido" tabIndex="-1">
        <Outlet />
      </main>
      <footer>
        <div className="container footer-grid">
          <div>
            <Link to="/" className="brand footer-brand">
              NOVA<strong>OBRA</strong>
            </Link>
            <p>Tu próximo proyecto empieza aquí.</p>
          </div>
          <div>
            <strong>Explora</strong>
            <Link to="/catalogo">Todos los productos</Link>
            <Link to="/ofertas">Ofertas vigentes</Link>
            <Link to="/favoritos">Mis favoritos</Link>
          </div>
          <div>
            <strong>Te ayudamos</strong>
            <Link to="/contacto">Contacto y cotizaciones</Link>
            <Link to="/cuenta">Mis pedidos</Link>
            <Link to="/guias">Guías y capacitación</Link>
          </div>
          <div>
            <strong>NovaObra</strong>
            <Link to="/nosotros">Sobre la ferretería</Link>
            {user && user.rol !== "cliente" && (
              <Link to="/admin">Administración</Link>
            )}
            <p>
              Retiro en tienda.
              <br />
              Consulta las opciones de entrega al pedir.
            </p>
          </div>
        </div>
        <div className="container footer-bottom">
          © {new Date().getFullYear()} NovaObra · Costa Rica{" "}
          <a className="photo-credits" href="/photos/CREDITOS.txt" target="_blank" rel="noopener noreferrer">Créditos de fotografía</a>
          <span>
            Los pedidos se pagan por los medios que confirme la tienda.
          </span>
        </div>
      </footer>
    </>
  );
}
