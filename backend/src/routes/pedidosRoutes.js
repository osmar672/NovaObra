import controller from '../controllers/pedidosController.js';
export default function register(router, pool, config, access) {
 const c=controller(pool,config), write=access.roles('administrador','empleado');
 router.get('/pedidos', ...write, c.list);
 router.get('/pedidos/:id', access.requireUser, c.read);
 router.post('/pedidos', ...write, c.create);
 router.put('/pedidos/:id', ...write, c.update);
 router.delete('/pedidos/:id', ...write, c.remove);
}
