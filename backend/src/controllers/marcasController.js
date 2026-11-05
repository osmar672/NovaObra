import { entidadController } from './entidadController.js';
import createModel from '../models/marcas.js';
export default (pool, config) => entidadController('marcas', pool, config, createModel(pool,config));
