import { model, definitions } from './entidades.js';
export const definition = definitions.movimientos_inventario;
export default (pool, config) => model('movimientos_inventario', pool, config);
