import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { money, productPath } from "../services/api.js";
import { useShop } from "../context/ShopContext.jsx";
export function Meta({
  title,
  description = "Herramientas, materiales y accesorios para construir tu próximo proyecto. Precios y disponibilidad de NovaObra.",
}) {
  useEffect(() => {
    document.title = `${title} | NovaObra`;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", description);
  }, [title, description]);
  return null;
}
export function Feedback({ error, loading }) {
  return (
    <>
      {loading && (
        <p role="status" className="feedback">
          Cargando información…
        </p>
      )}
      {error && (
        <p role="alert" className="feedback error">
          {error}
        </p>
      )}
    </>
  );
}
export function Empty({ children }) {
  return <div className="empty">{children}</div>;
}
export function ProductImage({ product }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [product.imagen]);
  return product.imagen && !failed ? (
    <img
      src={product.imagen}
      alt={product.nombre}
      loading="lazy"
      decoding="async"
      width="400"
      height="300"
      onError={() => setFailed(true)}
      referrerPolicy="no-referrer"
    />
  ) : (
    <div className="image-placeholder">
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <path
          d="M49 12a21 21 0 0 0-25 25L10 51a10 10 0 0 0 14 14l14-14a21 21 0 0 0 25-25L50 39 39 28z"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </svg>
      <span>Imagen no disponible</span>
    </div>
  );
}
export function ProductCard({ product: p }) {
  const { add, favorites, favorite } = useShop();
  const offer = p.precio_actual < p.precio;
  return (
    <article className="product-card">
      <div className="product-picture">
        <Link to={productPath(p)} aria-label={`Ver ${p.nombre}`}>
          <ProductImage product={p} />
        </Link>
        {offer && <span className="badge">Oferta</span>}
        <button
          className="favorite"
          aria-label={`${favorites.includes(p.id) ? "Quitar de" : "Guardar en"} favoritos: ${p.nombre}`}
          aria-pressed={favorites.includes(p.id)}
          onClick={() => favorite(p.id)}
        >
          {favorites.includes(p.id) ? "♥" : "♡"}
        </button>
      </div>
      <div className="product-copy">
        <small>
          {p.marca} · {p.categoria}
        </small>
        <h3>
          <Link to={productPath(p)}>{p.nombre}</Link>
        </h3>
        <p className="stock">
          {p.existencia > 0 ? `${p.existencia} disponibles` : "Agotado"}
        </p>
        <div className="price">
          {money(p.precio_actual)} {offer && <del>{money(p.precio)}</del>}
        </div>
        <button onClick={() => add(p)} disabled={p.existencia < 1}>
          Agregar al carrito <span aria-hidden="true">+</span>
        </button>
      </div>
    </article>
  );
}
export function PageHeading({ eyebrow, title, children }) {
  return (
    <div className="page-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {children}
    </div>
  );
}
