import controller from '../controllers/categoriasController.js';
export default function register(router, pool, config, access) {
 const c=controller(pool,config), write=access.roles('administrador','empleado');
 router.get('/categorias', ...write, c.list);
 router.get('/categorias/:id', ...write, c.read);
 router.post('/categorias', ...write, c.create);
 router.put('/categorias/:id', ...write, c.update);
 router.delete('/categorias/:id', ...write, c.remove);
}
