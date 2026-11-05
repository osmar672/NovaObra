import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { money, productPath } from "../services/api.js";
import { useShop } from "../context/ShopContext.jsx";
import {productVisual,productDescription,productPrice,photoPath} from '../services/presentation.js';
import {Icon} from './Visuals.jsx';
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
    <div className="product-reference">
      <img src={photoPath(productVisual(product))} alt={`Fotografía de referencia de herramientas; no representa necesariamente el modelo ${product.nombre}`} loading="lazy" decoding="async" width="640" height="480"/>
      <span>Foto de referencia</span>
    </div>
  );
}
export function ProductCard({ product: p }) {
  const { add, favorites, favorite } = useShop();
  const price=productPrice(p);
  const offer = price!==null && price < Number(p.precio);
  return (
    <article className="product-card">
      <div className="product-picture">
        <Link to={productPath(p)} aria-label={`Ver ${p.nombre}`}>
          <ProductImage product={p} />
        </Link>
        {offer && <span className="badge">Oferta</span>}
        {p.sku?.startsWith("NV-DEMO-")&&<span className="demo-label">Demostración</span>}
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
        <div className="price"><span className="price-label">Precio · CRC</span><strong>{price===null?'Consultar precio':money(price)}</strong>{offer && <del>{money(p.precio)}</del>}</div>
        <p className="product-description">{productDescription(p)}</p>
        <p className={`stock ${p.existencia>0?"in-stock":"out-of-stock"}`}>
          {p.existencia > 0 ? `${p.existencia} disponibles` : "Agotado"}
        </p>
        <Link className="product-details-link" to={productPath(p)}>Ver producto y descripción completa <Icon name="arrow" size={16}/></Link>
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
