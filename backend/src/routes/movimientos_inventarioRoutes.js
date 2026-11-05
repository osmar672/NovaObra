import controller from '../controllers/movimientos_inventarioController.js';
export default function register(router, pool, config, access) {
 const c=controller(pool,config), write=access.roles('administrador','empleado');
 router.get('/movimientos_inventario', ...write, c.list);
 router.get('/movimientos_inventario/:id', ...write, c.read);
 router.post('/movimientos_inventario', ...write, c.create);
 router.put('/movimientos_inventario/:id', ...write, c.update);
 router.delete('/movimientos_inventario/:id', ...write, c.remove);
}
