import React from "react";
import { title } from "../../utils/format.js";
import EntityField from "./EntityField.jsx";

export default function EntityEditor({ controller }) {
  const {
    editing,
    movement,
    setForm,
    save,
    busy,
    trade,
    data,
    pk,
    fields,
    definition,
  } = controller;
  const DetailForm = definition?.DetailForm;
  return (
    <section className="panel editor" aria-labelledby="form-title">
      <div className="toolbar">
        <h2 id="form-title">
          {editing
            ? `Registro #${editing}`
            : movement
              ? "Ajuste de inventario"
              : "Nuevo registro"}
        </h2>
        <button className="secondary" onClick={() => setForm(null)}>
          Cerrar
        </button>
      </div>
      <form onSubmit={save}>
        <fieldset
          disabled={
            busy ||
            (trade &&
              data.find((r) => r[pk] === editing)?.estado !== "borrador" &&
              editing !== null)
          }
        >
          <div className="form-grid">
            {Object.entries(fields).map(([k, t]) => (
              <label key={k} htmlFor={k}>
                {title(k)}
                <EntityField name={k} type={t} controller={controller} />
              </label>
            ))}
          </div>
          {trade && <DetailForm controller={controller} />}
          <button disabled={busy} type="submit">
            {busy ? "Guardando…" : "Guardar" + (trade ? " borrador" : "")}
          </button>
        </fieldset>
      </form>
    </section>
  );
}
