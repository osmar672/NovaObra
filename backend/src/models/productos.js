import { model, definitions } from './entidades.js';
export const definition = definitions.productos;
export default (pool, config) => model('productos', pool, config);
