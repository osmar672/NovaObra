import { model, definitions } from './entidades.js';
export const definition = definitions.pedidos;
export default (pool, config) => model('pedidos', pool, config);
