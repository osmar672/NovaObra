import controller from '../controllers/marcasController.js';
export default function register(router, pool, config, access) {
 const c=controller(pool,config), write=access.roles('administrador','empleado');
 router.get('/marcas', ...write, c.list);
 router.get('/marcas/:id', ...write, c.read);
 router.post('/marcas', ...write, c.create);
 router.put('/marcas/:id', ...write, c.update);
 router.delete('/marcas/:id', ...write, c.remove);
}
