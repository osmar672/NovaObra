import React from "react";
import TradeLines from "../../components/forms/TradeLines.jsx";
import { detalle_ventasService } from "../../services/detalle_ventasService.js";

// Details are edited within their parent draft so saving remains atomic.
export default function DetalleVentasForm({ controller }) {
  return (
    <TradeLines controller={controller} detailService={detalle_ventasService} />
  );
}
