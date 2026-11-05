import controller from '../controllers/inventarioController.js';
export default function register(router, pool, config, access) {
 const c=controller(pool,config), write=access.roles('administrador','empleado');
 router.get('/inventario', ...write, c.list);
 router.get('/inventario/:id', ...write, c.read);
 router.post('/inventario', ...write, c.create);
 router.put('/inventario/:id', ...write, c.update);
 router.delete('/inventario/:id', ...write, c.remove);
}
