import {AuthProvider} from "./context/AuthContext.jsx";
import RutaProtegida from "./components/RutaProtegida.jsx";
import Login from "./pages/Login.jsx";
import Registro from "./pages/Registro.jsx";
import Gestion_categorias from "./pages/categorias.jsx";
import Gestion_marcas from "./pages/marcas.jsx";
import Gestion_productos from "./pages/productos.jsx";
import Gestion_clientes from "./pages/clientes.jsx";
import Gestion_inventario from "./pages/inventario.jsx";
import Gestion_pedidos from "./pages/pedidos.jsx";
import Gestion_detalle_pedidos from "./pages/detalle_pedidos.jsx";
import Gestion_movimientos_inventario from "./pages/movimientos_inventario.jsx";
import React, { Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import { ShopProvider } from "./context/ShopContext.jsx";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import Catalog from "./pages/Catalog.jsx";
import Product from "./pages/Product.jsx";
import Cart from "./pages/Cart.jsx";
import Account from "./pages/Account.jsx";
import { About, Contact, Guides, Favorites } from "./pages/Information.jsx";
import "./styles.css";
import "./professional.css";
import {GoogleComplete} from './components/GoogleSignIn.jsx';
const Admin = lazy(() => import("./pages/Admin.jsx"));
function Scroll() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById("contenido")?.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}
function App() {
  return (
    <BrowserRouter>
      <AuthProvider><ShopProvider>
        <Scroll />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
<Route path="gestion/categorias" element={<RutaProtegida management><Gestion_categorias/></RutaProtegida>}/>
<Route path="gestion/marcas" element={<RutaProtegida management><Gestion_marcas/></RutaProtegida>}/>
<Route path="gestion/productos" element={<RutaProtegida management><Gestion_productos/></RutaProtegida>}/>
<Route path="gestion/clientes" element={<RutaProtegida management><Gestion_clientes/></RutaProtegida>}/>
<Route path="gestion/inventario" element={<RutaProtegida management><Gestion_inventario/></RutaProtegida>}/>
<Route path="gestion/pedidos" element={<RutaProtegida management><Gestion_pedidos/></RutaProtegida>}/>
<Route path="gestion/detalle_pedidos" element={<RutaProtegida management><Gestion_detalle_pedidos/></RutaProtegida>}/>
<Route path="gestion/movimientos_inventario" element={<RutaProtegida management><Gestion_movimientos_inventario/></RutaProtegida>}/>
            <Route path="auth/google/complete" element={<GoogleComplete/>}/><Route path="login" element={<Login/>}/><Route path="registro" element={<Registro/>}/><Route path="catalogo" element={<Catalog />} />
            <Route path="ofertas" element={<Catalog offers />} />
            <Route path="producto/:id/:slug" element={<Product />} />
            <Route path="carrito" element={<RutaProtegida><Cart /></RutaProtegida>} />
            <Route path="cuenta" element={<Account />} />
            <Route path="nosotros" element={<About />} />
            <Route path="contacto" element={<Contact />} />
            <Route path="guias" element={<Guides />} />
            <Route path="favoritos" element={<RutaProtegida><Favorites /></RutaProtegida>} />
            <Route
              path="admin"
              element={
                <Suspense
                  fallback={<p role="status">Cargando administración…</p>}
                >
                  <RutaProtegida management><Admin /></RutaProtegida>
                </Suspense>
              }
            />
            <Route
              path="*"
              element={
                <div className="container section">
                  <h1>Página no encontrada</h1>
                  <Link to="/">Volver al inicio</Link>
                </div>
              }
            />
          </Route>
        </Routes>
      </ShopProvider></AuthProvider>
    </BrowserRouter>
  );
}
createRoot(document.getElementById("root")).render(<App />);
