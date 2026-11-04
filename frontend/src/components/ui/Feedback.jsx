import React from "react";

export default function Feedback({ error, notice, loading, onDismissError }) {
  return (
    <>
      {error && (
        <div className="alert error" role="alert">
          {error}{" "}
          <button onClick={() => onDismissError()} aria-label="Cerrar error">
            ×
          </button>
        </div>
      )}
      {notice && (
        <div className="alert success" role="status">
          {notice}
        </div>
      )}
      {loading && (
        <div className="loading-line" role="status">
          Cargando información…
        </div>
      )}
    </>
  );
}
