import React from "react";
import { Link, useParams } from "react-router-dom";
import { useData } from "../hooks/useData.js";
import { useShop } from "../context/ShopContext.jsx";
import { money, productPath } from "../services/api.js";
import { Meta, ProductImage, Feedback } from "../components/UI.jsx";
import {productDescription,productPrice} from '../services/presentation.js';
import {Icon} from '../components/Visuals.jsx';
export default function Product() {
  const { id } = useParams(),
    state = useData(`/tienda/productos/${id}`, { poll: true }),
    { add, favorites, favorite, setNotice } = useShop(),
    p = state.data;
  const price=p?productPrice(p):null;
  async function share() {
    try {
      if (navigator.share)
        await navigator.share({ title: p.nombre, url: location.href });
      else {
        await navigator.clipboard.writeText(location.href);
        setNotice("Enlace copiado.");
      }
    } catch (error) {
      if (error.name !== "AbortError")
        setNotice("Copia la dirección de esta página para compartirla.");
    }
  }
  return (
    <div className="container section">
      <Feedback {...state} />
      {p && (
        <>
          <Meta title={p.nombre} description={productDescription(p).slice(0, 160)} />
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: p.nombre,
              sku: p.sku,
              description: p.descripcion,
              ...(p.imagen ? { image: p.imagen } : {}),
              brand: { "@type": "Brand", name: p.marca },
              offers: {
                "@type": "Offer",
                priceCurrency: "CRC",
                price: p.precio_actual,
                availability: `https://schema.org/${p.existencia ? "InStock" : "OutOfStock"}`,
                url: location.origin + productPath(p),
              },
            }).replace(/</g, "\u003c")}
          </script>
          <div className="breadcrumbs">
            <Link to="/">Inicio</Link> / <Link to="/catalogo">Catálogo</Link> /{" "}
            {p.nombre}
          </div>
          <div className="product-detail">
            <div className="detail-picture">
              <ProductImage product={p} />
            </div>
            <div>
              <span className="eyebrow">
                {p.marca} · {p.categoria}
              </span>
              <h1>{p.nombre}</h1>
              <p className="muted">SKU: {p.sku}</p>
              <div className="detail-price"><span className="price-label">Precio del producto · CRC</span>
                <strong>{price===null?"Consultar precio":money(price)}</strong>{" "}
                {price!==null && price < Number(p.precio) && <del>{money(p.precio)}</del>}
              </div>
              <p className={`stock ${p.existencia>0?"in-stock":"out-of-stock"}`}>
                {p.existencia
                  ? `${p.existencia} unidades disponibles`
                  : "Actualmente agotado"}
              </p>
              <h2 className="description-heading">Descripción del producto</h2>
              <p className="prewrap detail-description">{productDescription(p)}</p>
              <div className="button-row">
                <button disabled={!p.existencia} onClick={() => add(p)}>
                  Agregar al carrito +
                </button>
                <button
                  className="secondary"
                  onClick={() => favorite(p.id)}
                  aria-pressed={favorites.includes(p.id)}
                >
                  {favorites.includes(p.id)
                    ? "Quitar favorito"
                    : "Guardar favorito"}
                </button>
                <button className="secondary" onClick={share}>
                  Compartir
                </button>
              </div>
              <div className="product-benefits"><span><Icon name="box"/> Retiro en tienda</span><span><Icon name="list"/> Solicita tu cotización</span></div>
              <h2>Especificaciones</h2>
              <p className="prewrap">
                {p.especificaciones ||
                  "Consulta las especificaciones con la tienda."}
              </p>
              <Link to="/contacto">Consultar sobre este producto →</Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
