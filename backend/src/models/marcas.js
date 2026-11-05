import { model, definitions } from './entidades.js';
export const definition = definitions.marcas;
export default (pool, config) => model('marcas', pool, config);
