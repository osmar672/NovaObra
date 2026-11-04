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
      <ShopProvider>
        <Scroll />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="catalogo" element={<Catalog />} />
            <Route path="ofertas" element={<Catalog offers />} />
            <Route path="producto/:id/:slug" element={<Product />} />
            <Route path="carrito" element={<Cart />} />
            <Route path="cuenta" element={<Account />} />
            <Route path="nosotros" element={<About />} />
            <Route path="contacto" element={<Contact />} />
            <Route path="guias" element={<Guides />} />
            <Route path="favoritos" element={<Favorites />} />
            <Route
              path="admin"
              element={
                <Suspense
                  fallback={<p role="status">Cargando administración…</p>}
                >
                  <Admin />
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
      </ShopProvider>
    </BrowserRouter>
  );
}
createRoot(document.getElementById("root")).render(<App />);
