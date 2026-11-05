import { model, definitions } from './entidades.js';
export const definition = definitions.inventario;
export default (pool, config) => model('inventario', pool, config);
