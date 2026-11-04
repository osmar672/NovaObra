import { categoriaModel } from "./categoriaModel.js";
import { proveedorModel } from "./proveedorModel.js";
import { productoModel } from "./productoModel.js";
import { clienteModel } from "./clienteModel.js";
import { empleadoModel } from "./empleadoModel.js";

// Public catalog metadata remains compatible with existing API clients.
export const entities = {
  categorias: { pk: categoriaModel.pk, fields: categoriaModel.fields },
  proveedores: { pk: proveedorModel.pk, fields: proveedorModel.fields },
  productos: { pk: productoModel.pk, fields: productoModel.fields },
  clientes: { pk: clienteModel.pk, fields: clienteModel.fields },
  empleados: { pk: empleadoModel.pk, fields: empleadoModel.fields },
};
