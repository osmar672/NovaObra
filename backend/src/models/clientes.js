import { model, definitions } from './entidades.js';
export const definition = definitions.clientes;
export default (pool, config) => model('clientes', pool, config);
