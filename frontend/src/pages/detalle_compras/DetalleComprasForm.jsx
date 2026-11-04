import React from "react";
import TradeLines from "../../components/forms/TradeLines.jsx";
import { detalle_comprasService } from "../../services/detalle_comprasService.js";

// Details are edited within their parent draft so saving remains atomic.
export default function DetalleComprasForm({ controller }) {
  return (
    <TradeLines
      controller={controller}
      detailService={detalle_comprasService}
    />
  );
}
