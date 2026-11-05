import { entidadController } from './entidadController.js';
import createModel from '../models/pedidos.js';
export default (pool, config) => entidadController('pedidos', pool, config, createModel(pool,config));
