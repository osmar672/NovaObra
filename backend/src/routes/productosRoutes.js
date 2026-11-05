import controller from '../controllers/productosController.js';
export default function register(router, pool, config, access) {
 const c=controller(pool,config), write=access.roles('administrador','empleado');
 router.get('/productos', ...write, c.list);
 router.get('/productos/:id', ...write, c.read);
 router.post('/productos', ...write, c.create);
 router.put('/productos/:id', ...write, c.update);
 router.delete('/productos/:id', ...write, c.remove);
}
