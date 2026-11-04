import React from "react";
import { money } from "../../utils/format.js";

export default function Receipt({ data, onClose }) {
  return (
    <section
      className="panel receipt-preview"
      aria-label="Comprobante de venta"
    >
      <div className="toolbar receipt-controls">
        <button className="secondary" onClick={onClose}>
          Cerrar comprobante
        </button>
        <button onClick={() => window.print()}>Imprimir / Guardar PDF</button>
      </div>
      <div className="receipt-heading">
        <div>
          <p className="eyebrow">FERRETERÍA NOVAOBRA</p>
          <h2>Comprobante de venta #{data.id_venta}</h2>
          <p>Comprobante interno · No es una factura electrónica</p>
        </div>
        <span className={"badge " + data.estado}>{data.estado}</span>
      </div>
      <dl className="receipt-info">
        <div>
          <dt>Cliente</dt>
          <dd>{data.cliente_nombre}</dd>
        </div>
        <div>
          <dt>Fecha</dt>
          <dd>{data.fecha_venta}</dd>
        </div>
        <div>
          <dt>Empleado</dt>
          <dd>{data.empleado_nombre}</dd>
        </div>
        {data.cliente_telefono && (
          <div>
            <dt>Teléfono</dt>
            <dd>{data.cliente_telefono}</dd>
          </div>
        )}
        {data.cliente_correo && (
          <div>
            <dt>Correo</dt>
            <dd>{data.cliente_correo}</dd>
          </div>
        )}
        {data.cliente_direccion && (
          <div>
            <dt>Dirección</dt>
            <dd>{data.cliente_direccion}</dd>
          </div>
        )}
      </dl>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Precio unitario</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {data.detalles.map((l) => (
              <tr key={l.id_detalle_venta}>
                <td>{l.producto_codigo}</td>
                <td>{l.producto_nombre}</td>
                <td>{l.cantidad}</td>
                <td>{money(l.precio_unitario)}</td>
                <td>{money(l.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="receipt-total">
        Total: <strong>{money(data.total)}</strong>
      </p>
      {data.estado === "cancelada" && (
        <p className="receipt-cancelled">
          Operación cancelada. Este documento conserva el historial y no
          acredita una venta vigente.
        </p>
      )}
      {data.estado === "borrador" && (
        <p className="receipt-cancelled">
          Borrador sin confirmar. Documento informativo: no acredita una venta
          vigente.
        </p>
      )}
      <p className="receipt-note">
        Gracias por elegir Ferretería NovaObra. Para guardar este comprobante,
        selecciona Guardar como PDF en el diálogo de impresión del navegador.
      </p>
    </section>
  );
}
