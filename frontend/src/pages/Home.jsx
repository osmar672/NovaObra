import React,{useState} from 'react';
import {Link} from 'react-router-dom';
import {useData} from '../hooks/useData.js';
import {Meta,ProductCard,Feedback} from '../components/UI.jsx';
import {Icon,LocationMap} from '../components/Visuals.jsx';
import DemoCatalogButton from '../components/DemoCatalogButton.jsx';
export default function Home(){
 const [category,setCategory]=useState('');
 const categories=useData('/tienda/categorias'),products=useData('/tienda/productos'+(category?'?categoria='+encodeURIComponent(category):''),{poll:true});
 const refresh=()=>{categories.reload();products.reload();};
 return <>
  <Meta title="Ferretería y construcción"/>
  <section className="hero shop-hero"><div className="container hero-grid"><div><span className="eyebrow">NOVAOBRA · FERRETERÍA & CONSTRUCCIÓN</span><h1>Equípate para<br/><em>construir en grande.</em></h1><p>Elige tus herramientas, compara precios y reúne los materiales de tu próximo proyecto. El catálogo está abierto para explorar.</p><div className="button-row"><a className="button" href="#explorar-productos">Explorar productos <Icon name="arrow" size={17}/></a><Link className="text-link" to="/guias">Prepara tu próximo proyecto ↗</Link></div><div className="hero-footnote"><span>HERRAMIENTAS</span><span>MATERIALES</span><span>PROYECTOS</span></div></div><div className="hero-visual"><img src="/photos/workbench.avif" alt="Herramientas reales en un banco de trabajo" fetchPriority="high" width="960" height="920"/></div></div></section>
  <section className="container section product-discovery" id="explorar-productos">
   <div className="discovery-heading"><div><span className="eyebrow">ENCUENTRA CON QUÉ HACERLO</span><h2>Tu próximo proyecto empieza aquí.</h2><p>Fotos, descripciones y precios. Todo en un solo lugar.</p></div><Link className="discovery-all" to="/catalogo">Ver catálogo completo <Icon name="arrow" size={18}/></Link></div>
   <nav className="category-rail" aria-label="Explorar productos por departamento"><button className={category===''?'selected':''} aria-pressed={category===''} onClick={()=>setCategory('')}>Todo el catálogo</button>{categories.data?.map(c=><button key={c.id} className={category===String(c.id)?'selected':''} aria-pressed={category===String(c.id)} onClick={()=>setCategory(String(c.id))}>{c.nombre}</button>)}</nav>
   <DemoCatalogButton onLoaded={refresh}/>
   <Feedback {...products}/><Feedback error={categories.error}/>
   {products.error&&<button className="secondary" onClick={refresh}>Volver a intentar</button>}
   {products.data&&<div className="discovery-count"><strong>{products.data.total}</strong> productos {category?'en este departamento':'para tus proyectos'}<span>Precios en colones · CRC</span></div>}
   <div className="product-grid discovery-products">{products.data?.items.slice(0,8).map(p=><ProductCard key={p.id} product={p}/>)}</div>
   {products.data&&!products.data.items.length&&!products.error&&<div className="storefront-empty"><Icon name="box" size={40}/><h3>{category?'Este departamento aún no tiene productos publicados.':'Estamos preparando el catálogo.'}</h3><p>{category?'Explora los demás departamentos para encontrar lo que necesitas.':'Los productos publicados por la tienda aparecerán aquí con sus precios y descripciones.'}</p>{category&&<button className="secondary" onClick={()=>setCategory('')}>Ver todos los departamentos</button>}<Link to="/contacto">Consultar con la tienda →</Link></div>}
   {products.data?.total>8&&<div className="discovery-more"><Link className="button secondary" to={'/catalogo'+(category?'?categoria='+category:'')}>Explorar los {products.data.total} productos <Icon name="arrow" size={17}/></Link></div>}
  </section>
  <section className="project-help section"><div className="container project-help-grid"><div className="project-help-photo"><img src="/photos/workshop.avif" alt="Herramientas organizadas en un taller de carpintería" loading="lazy" width="1200" height="500"/></div><div className="project-help-copy"><span className="eyebrow">DE LA LISTA AL PROYECTO</span><h2>Menos vueltas.<br/>Más manos a la obra.</h2><p>Guarda lo que te interesa, prepara tu carrito y decide entre hacer un pedido o solicitar una cotización.</p><ol><li><span>01</span><div><strong>Encuentra tu herramienta</strong><p>Revisa la ficha, el precio y la disponibilidad.</p></div></li><li><span>02</span><div><strong>Arma tu lista</strong><p>Agrega cantidades y reúne los materiales.</p></div></li><li><span>03</span><div><strong>Continúa con tu cuenta</strong><p>Envía la solicitud y sigue su estado desde tu espacio.</p></div></li></ol><Link className="button" to="/guias">Guías para empezar <Icon name="arrow" size={17}/></Link></div></div></section>
  <div className="container section"><LocationMap/></div>
 </>;
}
