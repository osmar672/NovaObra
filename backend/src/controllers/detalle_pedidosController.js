import { entidadController } from './entidadController.js';
import createModel from '../models/detalle_pedidos.js';
export default (pool, config) => entidadController('detalle_pedidos', pool, config, createModel(pool,config));
