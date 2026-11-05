import { entidadController } from './entidadController.js';
import createModel from '../models/categorias.js';
export default (pool, config) => entidadController('categorias', pool, config, createModel(pool,config));
