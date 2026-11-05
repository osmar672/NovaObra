import { entidadController } from './entidadController.js';
import createModel from '../models/clientes.js';
export default (pool, config) => entidadController('clientes', pool, config, createModel(pool,config));
