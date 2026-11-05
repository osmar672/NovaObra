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
          <div className="hero-visual"><img src="/photos/workbench.avif" alt="Fotografía de un banco de carpintería con herramientas reales" fetchPriority="high" width="960" height="920"/><span className="hero-photo-label">TALLER · HERRAMIENTAS · PROYECTOS</span></div>
        </div>
      </section>
      <div className="shopping-steps container">{[['01','Elige tus materiales','Consulta fotos, precios y descripciones.','tool'],['02','Prepara tu lista','Agrega productos o guarda tus favoritos.','list'],['03','Envía tu solicitud','Pide una cotización y consulta su estado.','box']].map(([number,title,text,icon])=><div key={number}><span className="step-number">{number}</span><div><strong>{title}</strong><p>{text}</p></div><Icon name={icon}/></div>)}</div>
      <section className="container section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">ENCUENTRA LO QUE NECESITAS</span>
            <h2>Compra por departamento</h2>
          </div>
          <Link to="/catalogo">Ver catálogo →</Link>
        </div>
        <Feedback {...categories} />
        <div className="category-grid">
          {displayedCategories.slice(0,6).map((c, i) => (
            <Link to={c.id?`/catalogo?categoria=${c.id}`:'/catalogo'} key={c.id||c.nombre}>
              <img src={photoPath(c.visual||productVisual({nombre:c.nombre}))} alt="" loading="lazy" width="640" height="480"/><span className="category-number">0{i + 1}</span>
              <div className="department-copy"><h3>{c.nombre}</h3><p>{c.descripcion||"Explora este departamento"}</p></div>
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
              {latest.data&&<p className="catalog-totals"><strong>{latest.data.total}</strong> productos en el catálogo · <strong>{categories.data?.length||0}</strong> departamentos</p>}
            </div>
            <Link to="/catalogo">Ver todos →</Link>
          </div>
          <Feedback {...featured} />
          {!user&&<div className="catalog-invitation"><img src="/photos/drill.webp" alt="Fotografía de un taladro real sobre fondo blanco" loading="lazy"/><div><span className="eyebrow">PREPARA TU PRÓXIMO PROYECTO</span><h3>Encuentra tu próxima herramienta.</h3><p>Inicia sesión para ver el catálogo con sus precios, descripciones y existencias. Usa tu cuenta de siempre.</p><Link className="button" to="/login">Entrar al catálogo <Icon name="arrow"/></Link></div></div>}
          <div className="product-grid">
            {featured.data?.items.slice(0, 8).map((p) => (
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
          {latest.data?.items.slice(0, 8).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>}
      <div className="container section"><LocationMap/></div>
    </>
  );
}
