import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../hooks/useData.js";
import { useShop } from "../context/ShopContext.jsx";
import { api } from "../services/api.js";
import {
  Feedback,
  Meta,
  PageHeading,
  Empty,
  ProductCard,
} from "../components/UI.jsx";
import {LocationMap} from '../components/Visuals.jsx';
export function About() {
  const state = useData("/config");
  return (
    <div className="container section narrow">
      <Meta title="Nosotros" />
      <PageHeading eyebrow="NOVAOBRA" title="Un lugar para tus proyectos" />
      <img className="about-cover" src="/photos/workshop.avif" alt="Fotografía de herramientas organizadas en un taller"/>
      <Feedback {...state} />
      <p className="lead prewrap">
        {state.data?.about ||
          "Consulta nuestro catálogo de herramientas, materiales y accesorios. Puedes preparar pedidos y solicitar cotizaciones para tu proyecto."}
      </p>
      {!state.data?.about && (
        <p className="muted">
          La historia, misión y visión de la empresa están pendientes de
          publicación por la ferretería.
        </p>
      )}
      <Link className="button" to="/contacto">
        Contactar con la tienda →
      </Link>
    </div>
  );
}
export function Contact() {
  const state = useData("/config"),
    [notice, setNotice] = useState(""),
    c = state.data;
  function submit(event) {
    event.preventDefault();
    if (!c?.email) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    location.href = `mailto:${encodeURIComponent(c.email)}?subject=${encodeURIComponent(`Consulta de ${data.nombre}`)}&body=${encodeURIComponent(`${data.mensaje}\n\nNombre: ${data.nombre}\nCorreo: ${data.email}`)}`;
    setNotice(
      "Se abrió tu aplicación de correo. Revisa el mensaje y envíalo allí; este formulario no lo envía automáticamente.",
    );
  }
  return (
    <div className="container section">
      <Meta title="Contacto" />
      <PageHeading eyebrow="CONVERSEMOS" title="Estamos para ayudarte"><p>Cuéntanos qué quieres construir. El siguiente paso empieza con una buena conversación.</p></PageHeading>
      <Feedback {...state} />
      <div className="contact-grid">
        <div className="panel">
          <h2>Contacta a NovaObra</h2>
          {c?.phone && (
            <p>
              Teléfono:{" "}
              <a href={`tel:${c.phone.replace(/[^+\d]/g, "")}`}>{c.phone}</a>
            </p>
          )}
          {c?.whatsapp && (
            <p>
              <a
                className="button"
                href={`https://wa.me/${c.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Consultar por WhatsApp →
              </a>
            </p>
          )}
          {c?.email && (
            <p>
              <a href={`mailto:${c.email}`}>{c.email}</a>
            </p>
          )}
          {c?.address && <p className="prewrap">Ubicación: {c.address}</p>}
          {c && !c.phone && !c.email && !c.whatsapp && !c.address && (
            <p>La tienda todavía no ha publicado sus datos de contacto.</p>
          )}
          <h3>¿Necesitas una cotización?</h3>
          <p>
            Agrega tus materiales al carrito y selecciona «Solicitud de
            cotización».
          </p>
          <Link to="/catalogo">Preparar cotización →</Link>
        </div>
        {c?.email && (
          <form className="panel" onSubmit={submit}>
            <h2>Preparar un correo</h2>
            <label>
              Tu nombre
              <input name="nombre" required maxLength={120} />
            </label>
            <label>
              Tu correo
              <input name="email" type="email" required />
            </label>
            <label>
              Mensaje
              <textarea name="mensaje" required maxLength={2000} />
            </label>
            <p className="muted">
              Se abrirá tu aplicación de correo para enviar el mensaje.
            </p>
            <button>Continuar en mi correo</button>
            {notice && <p role="status">{notice}</p>}
          </form>
        )}
      </div>
      <LocationMap/>
    </div>
  );
}
export function Guides() {
  return (
    <div className="container section narrow">
      <Meta title="Guías y capacitación" />
      <PageHeading eyebrow="APRENDE Y CONSTRUYE" title="Guías y capacitación" />
      <Empty>
        Los videos, podcasts y eventos estarán disponibles cuando la ferretería
        publique su contenido. Este módulo está pendiente de integración.
      </Empty>
      <p>
        Consulta los manuales del fabricante y utiliza el equipo de protección
        correspondiente a cada herramienta.
      </p>
    </div>
  );
}
export function Favorites() {
  const { favorites } = useShop(),
    [state, setState] = useState({ data: [], loading: true, error: "" }),
    key = JSON.stringify(favorites);
  useEffect(() => {
    const c = new AbortController();
    setState({ data: [], loading: true, error: "" });
    Promise.all(
      favorites.map((id) =>
        api(`/productos/${id}`, { signal: c.signal }).catch((e) => {
          if (e.status === 404) return null;
          throw e;
        }),
      ),
    )
      .then((data) => {
        if (!c.signal.aborted)
          setState({ data: data.filter(Boolean), loading: false, error: "" });
      })
      .catch((e) => {
        if (!c.signal.aborted)
          setState({ data: [], loading: false, error: e.message });
      });
    return () => c.abort();
  }, [key]);
  return (
    <div className="container section">
      <Meta title="Favoritos" />
      <PageHeading
        eyebrow="GUARDADOS EN ESTE NAVEGADOR"
        title="Mis favoritos"
      />
      <Feedback {...state} />
      <div className="product-grid">
        {state.data.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      {!state.loading && !state.data.length && (
        <Empty>
          No hay favoritos disponibles.{" "}
          <Link to="/catalogo">Explora el catálogo.</Link>
        </Empty>
      )}
    </div>
  );
}
