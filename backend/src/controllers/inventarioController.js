import { entidadController } from './entidadController.js';
import createModel from '../models/inventario.js';
export default (pool, config) => entidadController('inventario', pool, config, createModel(pool,config));
