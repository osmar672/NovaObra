import controller from '../controllers/detalle_pedidosController.js';
export default function register(router, pool, config, access) {
 const c=controller(pool,config), write=access.roles('administrador','empleado');
 router.get('/detalle_pedidos', ...write, c.list);
 router.get('/detalle_pedidos/:id', ...write, c.read);
 router.post('/detalle_pedidos', ...write, c.create);
 router.put('/detalle_pedidos/:id', ...write, c.update);
 router.delete('/detalle_pedidos/:id', ...write, c.remove);
}
