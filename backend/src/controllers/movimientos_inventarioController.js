import { entidadController } from './entidadController.js';
import createModel from '../models/movimientos_inventario.js';
export default (pool, config) => entidadController('movimientos_inventario', pool, config, createModel(pool,config));
