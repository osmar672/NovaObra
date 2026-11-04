import React from "react";
import { title } from "../../utils/format.js";
import { referenceTable } from "../../utils/relationships.js";

export default function EntityField({ name: k, type: t, controller }) {
  const { form, setForm, lookups, movement } = controller;
  const value = form[k] ?? "";
  const props = {
    id: k,
    name: k,
    "aria-label": title(k),
    value,
    onChange: (e) => setForm({ ...form, [k]: e.target.value }),
    required: !["optional", "email"].includes(t),
  };
  if (t === "id")
    return (
      <select {...props}>
        <option value="">Seleccione…</option>
        {(lookups[referenceTable(k)] || []).map((r) => (
          <option key={r[k]} value={r[k]}>
            {r.nombre} {r.apellido || ""} (#{r[k]})
          </option>
        ))}
      </select>
    );
  if (t === "active" || t === "movement")
    return (
      <select {...props}>
        {(t === "active" ? ["activo", "inactivo"] : ["entrada", "salida"]).map(
          (v) => (
            <option key={v}>{v}</option>
          ),
        )}
      </select>
    );
  return (
    <input
      {...props}
      type={
        t === "date"
          ? "date"
          : t === "email"
            ? "email"
            : ["money", "quantity"].includes(t)
              ? "number"
              : "text"
      }
      min={
        ["money", "quantity"].includes(t)
          ? movement && k === "cantidad"
            ? 1
            : 0
          : undefined
      }
      max={
        t === "quantity" ? 1000000 : t === "money" ? 9999999999.99 : undefined
      }
      maxLength={t === "text" ? 120 : 255}
      step={t === "money" ? "0.01" : t === "quantity" ? "1" : undefined}
    />
  );
}
