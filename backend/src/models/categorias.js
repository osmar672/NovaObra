import { model, definitions } from './entidades.js';
export const definition = definitions.categorias;
export default (pool, config) => model('categorias', pool, config);
