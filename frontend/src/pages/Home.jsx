import React from "react";
import { Link } from "react-router-dom";
import { useData } from "../hooks/useData.js";
import { Meta, ProductCard, Feedback, Empty } from "../components/UI.jsx";
import {useAuth} from "../context/AuthContext.jsx";
import {Icon,LocationMap} from '../components/Visuals.jsx';
import {productVisual,photoPath} from '../services/presentation.js';
export default function Home() {
  const {user}=useAuth();
  const featured = useData(user ? "/productos?destacado=1" : null, { poll: true }),
    latest = useData(user ? "/productos?orden=nuevos" : null, { poll: true }),
    categories = useData(user ? "/categorias" : null);
  const inspiration=[{nombre:'Herramientas',descripcion:'Equipa tus ideas.',visual:'drill'},{nombre:'Medición',descripcion:'Cada detalle cuenta.',visual:'measure'},{nombre:'Corte y acabado',descripcion:'Dale forma a tus ideas.',visual:'saw'},{nombre:'Herramientas manuales',descripcion:'Lo esencial de tu taller.',visual:'hammer'},{nombre:'Plomería',descripcion:'Cada conexión cuenta.',visual:'wrench'},{nombre:'Seguridad',descripcion:'Trabaja con protección.',visual:'helmet'}];
  const displayedCategories=categories.data?.length?categories.data:inspiration;
  return (
    <>
      <Meta title="Ferretería y construcción" />
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow">FERRETERÍA & CONSTRUCCIÓN · COSTA RICA</span>
            <h1>
              Equípate para
              <br />
              <em>construir en grande.</em>
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
          <div className="hero-visual"><img src="/photos/workbench.avif" alt="Fotografía de un banco de carpintería con herramientas reales" fetchPriority="high" width="960" height="920"/><div className="hero-image-caption"><span className="caption-icon"><Icon name="tool"/></span><div><strong>De la idea a la obra.</strong><span>Encuentra con qué hacerlo posible.</span></div><span className="caption-number">01 —</span></div><span className="hero-vertical-label">NOVAOBRA / HECHO PARA CONSTRUIR</span></div>
        </div>
      </section>
      <div className="value-strip container">
        <div>
          <Icon name="box"/><b>Disponibilidad real</b>
          <span>Existencias consultadas en la tienda</span>
        </div>
        <div>
          <Icon name="list"/><b>Compra a tu ritmo</b>
          <span>Guarda favoritos y prepara tu carrito</span>
        </div>
        <div>
          <Icon name="pin"/><b>Retiro en tienda</b>
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
          {displayedCategories.map((c, i) => (
            <Link to={c.id?`/catalogo?categoria=${c.id}`:'/catalogo'} key={c.id||c.nombre}>
              <img src={photoPath(c.visual||productVisual({nombre:c.nombre}))} alt="" loading="lazy" width="640" height="480"/><span className="category-number">0{i + 1}</span>
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
          {!user&&<div className="catalog-invitation"><img src="/photos/drill.webp" alt="Fotografía de un taladro real sobre fondo blanco" loading="lazy"/><div><span className="eyebrow">PREPARA TU PRÓXIMO PROYECTO</span><h3>Encuentra tu próxima herramienta.</h3><p>Inicia sesión para ver el catálogo con sus precios, descripciones y existencias. Usa tu cuenta de siempre.</p><Link className="button" to="/login">Entrar al catálogo <Icon name="arrow"/></Link></div></div>}
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
      {user&&<section className="container section">
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
      </section>}
      <div className="container section"><LocationMap/></div>
    </>
  );
}
