import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
const Context = createContext(null);
function read(key, fallback, validate) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return validate(value) ? value : fallback;
  } catch {
    return fallback;
  }
}
export function ShopProvider({ children }) {
  const {user,setUser,authReady,authError,logout}=useAuth();
  const [cart, setCart] = useState(() =>
    read(
      "novaobra-cart",
      [],
      (v) =>
        Array.isArray(v) &&
        v.length <= 50 &&
        v.every(
          (x) =>
            Number.isInteger(x.id) &&
            x.id > 0 &&
            Number.isInteger(x.cantidad) &&
            x.cantidad > 0 &&
            x.cantidad <= 10000,
        ),
    ),
  );
  const [favorites, setFavorites] = useState(() =>
    read(
      "novaobra-favorites",
      [],
      (v) => Array.isArray(v) && v.length <= 100 && v.every(Number.isInteger),
    ),
  );
  const [notice, setNotice] = useState("");
  useEffect(() => {
    try {
      localStorage.setItem("novaobra-cart", JSON.stringify(cart));
    } catch {
      setNotice(
        "El navegador no permite guardar el carrito al cerrar esta página.",
      );
    }
  }, [cart]);
  useEffect(() => {
    try {
      localStorage.setItem("novaobra-favorites", JSON.stringify(favorites));
    } catch {}
  }, [favorites]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(id);
  }, [notice]);
  const add = (product) => {
    if (product.existencia < 1) {
      setNotice("Este producto está agotado.");
      return;
    }
    setCart((old) => {
      const item = old.find((x) => x.id === product.id);
      if (!item && old.length >= 50) {
        setNotice("El carrito admite hasta 50 productos distintos.");
        return old;
      }
      if (item && item.cantidad >= Math.min(product.existencia, 10000)) {
        setNotice("Ya agregaste las unidades disponibles.");
        return old;
      }
      setNotice("Producto agregado al carrito.");
      return item
        ? old.map((x) =>
            x.id === product.id ? { ...x, cantidad: x.cantidad + 1 } : x,
          )
        : [...old, { id: product.id, cantidad: 1 }];
    });
  };
  const favorite = (id) =>
    setFavorites((old) =>
      old.includes(id)
        ? old.filter((x) => x !== id)
        : old.length < 100
          ? [...old, id]
          : old,
    );
  return (
    <Context.Provider
      value={{
        user,
        setUser,
        authReady,
        authError,
        cart,
        setCart,
        add,
        favorites,
        favorite,
        notice,
        setNotice,
        logout,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useShop = () => useContext(Context);
