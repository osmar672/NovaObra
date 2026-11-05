import React from "react";
import { Link } from "react-router-dom";
import { useData } from "../hooks/useData.js";
import { Meta, ProductCard, Feedback, Empty } from "../components/UI.jsx";
import {useAuth} from "../context/AuthContext.jsx";
import {Icon,LocationMap} from '../components/Visuals.jsx';
import {productVisual} from '../services/presentation.js';
export default function Home() {
  const {user}=useAuth();
  const featured = useData(user ? "/productos?destacado=1" : null, { poll: true }),
    latest = useData(user ? "/productos?orden=nuevos" : null, { poll: true }),
    categories = useData(user ? "/categorias" : null);
  const inspiration=[{nombre:'Herramientas',descripcion:'Equipa tus ideas.',visual:'tools'},{nombre:'Construcción',descripcion:'Las bases de tu proyecto.',visual:'materials'},{nombre:'Pinturas',descripcion:'Renueva cada espacio.',visual:'paint'},{nombre:'Electricidad',descripcion:'Conecta tus proyectos.',visual:'electric'},{nombre:'Plomería',descripcion:'Cada conexión cuenta.',visual:'plumbing'},{nombre:'Seguridad',descripcion:'Trabaja con protección.',visual:'safety'}];
  const displayedCategories=categories.data?.length?categories.data:inspiration;
  return (
    <>
      <Meta title="Ferretería y construcción" />
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow">FERRETERÍA & CONSTRUCCIÓN · COSTA RICA</span>
            <h1>
              Tu próxima gran obra
              <br />
              <em>empieza aquí.</em>
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
          <div className="hero-visual"><img src="/images/workshop.svg" alt="Taller ilustrado con taladro, casco y materiales de construcción" fetchPriority="high" width="960" height="920"/><div className="hero-image-caption"><span className="caption-icon"><Icon name="tool"/></span><div><strong>De la idea a la obra.</strong><span>Encuentra con qué hacerlo posible.</span></div><span className="caption-number">01 —</span></div><span className="hero-vertical-label">NOVAOBRA / HECHO PARA CONSTRUIR</span></div>
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
              <img src={`/images/${c.visual||productVisual({nombre:c.nombre})}.svg`} alt="" loading="lazy" width="640" height="480"/><span className="category-number">0{i + 1}</span>
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
          {!user&&<div className="catalog-invitation"><img src="/images/tools.svg" alt="Ilustración de herramientas para tu proyecto" loading="lazy"/><div><span className="eyebrow">PREPARA TU PRÓXIMO PROYECTO</span><h3>Las herramientas correctas.<br/>Las posibilidades que imaginas.</h3><p>Inicia sesión para explorar productos, consultar precios y disponibilidad, y guardar tu lista de materiales.</p><Link className="button" to="/login">Entrar al catálogo <Icon name="arrow"/></Link></div></div>}
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
