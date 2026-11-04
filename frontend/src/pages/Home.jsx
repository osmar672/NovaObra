import React from "react";
import { Link } from "react-router-dom";
import { useData } from "../hooks/useData.js";
import { Meta, ProductCard, Feedback, Empty } from "../components/UI.jsx";
export default function Home() {
  const featured = useData("/productos?destacado=1", { poll: true }),
    latest = useData("/productos?orden=nuevos", { poll: true }),
    categories = useData("/categorias");
  return (
    <>
      <Meta title="Ferretería y construcción" />
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow">MANOS A LA OBRA</span>
            <h1>
              Grandes proyectos.
              <br />
              <em>Buenas herramientas.</em>
            </h1>
            <p>
              Encuentra los materiales y herramientas para darle forma a tus
              ideas. Consulta existencias, compara y prepara tu pedido.
            </p>
            <div className="button-row">
              <Link className="button" to="/catalogo">
                Explorar catálogo <span aria-hidden="true">→</span>
              </Link>
              <Link className="text-link" to="/contacto">
                Solicitar una cotización →
              </Link>
            </div>
            <div className="hero-footnote">
              <span>01 / Construye</span>
              <span>02 / Renueva</span>
              <span>03 / Crea</span>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="grid-drawing" />
            <div className="art-circle" />
            <svg viewBox="0 0 460 380">
              <g transform="rotate(-25 220 200)">
                <path
                  d="M115 125h175l50 30v65H115z"
                  fill="#f6c500"
                  stroke="#24272a"
                  strokeWidth="5"
                />
                <path d="M290 135h45v70h-45z" fill="#303438" />
                <path d="M335 151h42v37h-42z" fill="#878b8e" />
                <path d="M377 164h55" stroke="#25292d" strokeWidth="14" />
                <path d="m180 220 16 99h67l-18-99" fill="#292d30" />
                <path
                  d="M188 310h89v33h-89z"
                  fill="#f6c500"
                  stroke="#292d30"
                  strokeWidth="5"
                />
                <path
                  d="M128 144h90M128 159h75M128 174h90"
                  stroke="#b79400"
                  strokeWidth="5"
                />
                <path
                  d="M258 225h24v40h-21"
                  fill="none"
                  stroke="#222"
                  strokeWidth="9"
                />
              </g>
            </svg>
            <span className="art-label">
              EQUÍPATE PARA
              <br />
              <strong>HACERLO POSIBLE.</strong>
            </span>
          </div>
        </div>
      </section>
      <div className="value-strip container">
        <div>
          <b>Disponibilidad real</b>
          <span>Existencias consultadas en la tienda</span>
        </div>
        <div>
          <b>Compra a tu ritmo</b>
          <span>Guarda favoritos y prepara tu carrito</span>
        </div>
        <div>
          <b>Retiro en tienda</b>
          <span>Consulta el estado de tu pedido</span>
        </div>
      </div>
      <section className="container section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">ENCUENTRA LO QUE NECESITAS</span>
            <h2>Una solución para cada proyecto</h2>
          </div>
          <Link to="/catalogo">Ver catálogo →</Link>
        </div>
        <Feedback {...categories} />
        <div className="category-grid">
          {categories.data?.map((c, i) => (
            <Link to={`/catalogo?categoria=${c.id}`} key={c.id}>
              <span className="category-number">0{i + 1}</span>
              <h3>{c.nombre}</h3>
              <p>{c.descripcion}</p>
              <span aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="section soft">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">SELECCIONADOS PARA TI</span>
              <h2>Productos destacados</h2>
            </div>
            <Link to="/catalogo">Ver todos →</Link>
          </div>
          <Feedback {...featured} />
          <div className="product-grid">
            {featured.data?.items.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          {featured.data && !featured.data.items.length && (
            <Empty>
              Pronto encontrarás productos destacados.{" "}
              <Link to="/catalogo">Consulta el catálogo disponible.</Link>
            </Empty>
          )}
        </div>
      </section>
      <section className="container section">
        <div className="project-banner">
          <div>
            <span className="eyebrow">DE LA IDEA A LA OBRA</span>
            <h2>¿Estás preparando un proyecto?</h2>
            <p>
              Arma tu lista de materiales y envíanos una solicitud de cotización
              desde el carrito.
            </p>
          </div>
          <Link className="button" to="/catalogo">
            Preparar mi lista →
          </Link>
        </div>
      </section>
      <section className="container section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">EXPLORA EL CATÁLOGO</span>
            <h2>Recién agregados</h2>
          </div>
        </div>
        <Feedback {...latest} />
        <div className="product-grid">
          {latest.data?.items.slice(0, 4).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </>
  );
}
