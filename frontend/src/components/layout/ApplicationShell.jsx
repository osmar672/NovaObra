import React from "react";
import { labels } from "../../pages/index.js";
import Feedback from "../ui/Feedback.jsx";

export default function ApplicationShell({ controller, children }) {
  const {
    page,
    receipt,
    navigate,
    loading,
    busy,
    load,
    error,
    notice,
    setError,
  } = controller;
  return (
    <div className={"shell" + (receipt ? " showing-receipt" : "")}>
      <aside>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("dashboard");
          }}
        >
          <span className="logo">N</span>
          <span>
            NovaObra<small>CONTROL ADMINISTRATIVO</small>
          </span>
        </a>
        <p className="nav-caption">ESPACIO DE TRABAJO</p>
        <nav>
          {Object.entries(labels).map(([key, label], i) => (
            <button
              className={page === key ? "selected" : ""}
              key={key}
              onClick={() => navigate(key)}
            >
              <span className="nav-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              {label}
            </button>
          ))}
        </nav>
        <div className="aside-footer">
          Ferretería NovaObra
          <br />
          <small>Aplicación académica local</small>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <p className="eyebrow">GESTIÓN DE FERRETERÍA</p>
            <h1>{labels[page]}</h1>
          </div>
          <button
            className="secondary"
            disabled={loading || busy}
            onClick={load}
          >
            Actualizar
          </button>
        </header>
        <p className="intro">
          {page === "dashboard"
            ? "Una visión clara de tu negocio, en un solo lugar."
            : `Administra ${labels[page].toLowerCase()} y consulta tus registros.`}
        </p>
        <Feedback
          error={error}
          notice={notice}
          loading={loading}
          onDismissError={() => setError("")}
        />
        {children}
        <footer>NovaObra Control · Herramientas para administrar mejor.</footer>
      </main>
    </div>
  );
}
