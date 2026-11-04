import React from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useData } from "../hooks/useData.js";
import {
  Meta,
  PageHeading,
  ProductCard,
  Feedback,
  Empty,
} from "../components/UI.jsx";
export default function Catalog({ offers = false }) {
  const [params, setParams] = useSearchParams(),
    query = new URLSearchParams(params);
  if (offers) query.set("ofertas", "1");
  const products = useData(`/productos?${query}`, { poll: true }),
    categories = useData("/categorias"),
    brands = useData("/marcas");
  const change = (key, value) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    if (key !== "pagina") next.delete("pagina");
    setParams(next);
  };
  return (
    <div className="container section">
      <Meta title={offers ? "Ofertas" : "Catálogo"} />
      <div className="breadcrumbs">
        <Link to="/">Inicio</Link> / {offers ? "Ofertas" : "Catálogo"}
      </div>
      <PageHeading
        eyebrow="TODO PARA TU PROYECTO"
        title={offers ? "Ofertas vigentes" : "Nuestro catálogo"}
      >
        <p>
          Precios en colones. Existencias y promociones actualizadas cada 30
          segundos.
        </p>
      </PageHeading>
      <div className="catalog-layout">
        <aside className="filters">
          <h2>Filtrar productos</h2>
          <label>
            Buscar
            <input
              value={params.get("q") || ""}
              onChange={(e) => change("q", e.target.value)}
              placeholder="Nombre, SKU, marca…"
              maxLength={100}
            />
          </label>
          <label>
            Categoría
            <select
              value={params.get("categoria") || ""}
              onChange={(e) => change("categoria", e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {categories.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            Marca
            <select
              value={params.get("marca") || ""}
              onChange={(e) => change("marca", e.target.value)}
            >
              <option value="">Todas las marcas</option>
              {brands.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
          <div className="two-columns">
            <label>
              Precio mínimo
              <input
                type="number"
                min="0"
                step="0.01"
                value={params.get("min") || ""}
                onChange={(e) => change("min", e.target.value)}
              />
            </label>
            <label>
              Precio máximo
              <input
                type="number"
                min="0"
                step="0.01"
                value={params.get("max") || ""}
                onChange={(e) => change("max", e.target.value)}
              />
            </label>
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={params.get("disponible") === "1"}
              onChange={(e) =>
                change("disponible", e.target.checked ? "1" : "")
              }
            />{" "}
            Solo disponibles
          </label>
          <button className="secondary" onClick={() => setParams({})}>
            Limpiar filtros
          </button>
          <Feedback error={categories.error || brands.error} />
        </aside>
        <div>
          <div className="catalog-toolbar">
            <p>
              {products.data
                ? `${products.data.total} productos`
                : "Consultando productos"}
            </p>
            <label>
              Ordenar
              <select
                value={params.get("orden") || ""}
                onChange={(e) => change("orden", e.target.value)}
              >
                <option value="">Recomendados</option>
                <option value="nuevos">Más recientes</option>
                <option value="precio_asc">Menor precio</option>
                <option value="precio_desc">Mayor precio</option>
                <option value="nombre">Nombre</option>
              </select>
            </label>
          </div>
          <Feedback {...products} />
          <div className="product-grid catalog-products">
            {products.data?.items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          {products.data && !products.data.items.length && (
            <Empty>
              No hay productos con estos filtros. Prueba otra búsqueda.
            </Empty>
          )}
          {products.data?.paginas > 1 && (
            <nav className="pagination" aria-label="Páginas del catálogo">
              <button
                disabled={products.data.pagina <= 1}
                onClick={() =>
                  change("pagina", String(products.data.pagina - 1))
                }
              >
                Anterior
              </button>
              <span>
                {products.data.pagina} de {products.data.paginas}
              </span>
              <button
                disabled={products.data.pagina >= products.data.paginas}
                onClick={() =>
                  change("pagina", String(products.data.pagina + 1))
                }
              >
                Siguiente
              </button>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
