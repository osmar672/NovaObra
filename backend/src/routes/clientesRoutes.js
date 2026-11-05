import controller from '../controllers/clientesController.js';
export default function register(router, pool, config, access) {
 const c=controller(pool,config), write=access.roles('administrador','empleado');
 router.get('/clientes', ...write, c.list);
 router.get('/clientes/:id', ...write, c.read);
 router.post('/clientes', ...write, c.create);
 router.put('/clientes/:id', ...write, c.update);
 router.delete('/clientes/:id', ...write, c.remove);
}
