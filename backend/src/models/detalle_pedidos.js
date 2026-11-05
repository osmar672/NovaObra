import { model, definitions } from './entidades.js';
export const definition = definitions.detalle_pedidos;
export default (pool, config) => model('detalle_pedidos', pool, config);
