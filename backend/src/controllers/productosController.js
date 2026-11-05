import { entidadController } from './entidadController.js';
import createModel from '../models/productos.js';
export default (pool, config) => entidadController('productos', pool, config, createModel(pool,config));
