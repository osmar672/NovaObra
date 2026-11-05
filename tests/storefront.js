import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,available} from './helpers.js';
test('Catálogo público: datos visibles sin sesión, campos privados excluidos y mutaciones protegidas',{skip:!available,timeout:15000},async()=>{
 const f=await fixture();try{
  let catalog=await f.request('/api/tienda/productos');assert.equal(catalog.status,200);assert.equal(catalog.body.total,7);
  const product=catalog.body.items[0];for(const key of ['descripcion','precio','precio_actual','nombre','existencia'])assert.ok(key in product);for(const key of ['minimo','activo','creado','password_hash'])assert.ok(!(key in product));
  assert.equal((await f.request('/api/tienda/productos/'+product.id)).status,200);
  assert.equal((await f.request('/api/productos')).status,401);assert.equal((await f.request('/api/pedidos')).status,401);assert.equal((await f.request('/api/admin/dashboard')).status,401);
  assert.equal((await f.request('/api/tienda/productos',{method:'POST',body:{nombre:'No permitido'}})).status,404);
  await f.pool.execute('UPDATE productos SET activo=0 WHERE id=?',[product.id]);assert.equal((await f.request('/api/tienda/productos/'+product.id)).status,404);assert.equal((await f.request('/api/tienda/productos')).body.total,6);
  const [{body:admin},{body:employee}]=await Promise.all([f.login('admin@example.test'),f.login('empleado@example.test')]);
  assert.equal((await f.request('/api/admin/catalogo-demo',{method:'POST',body:{}})).status,401);
  assert.equal((await f.request('/api/admin/catalogo-demo',{method:'POST',body:{},token:employee.token})).status,403);
  const loaded=await f.request('/api/admin/catalogo-demo',{method:'POST',body:{},token:admin.token});assert.equal(loaded.status,200);assert.equal(loaded.body.added,48);
  catalog=await f.request('/api/tienda/productos');assert.equal(catalog.body.total,54);
  assert.equal((await f.request('/api/admin/catalogo-demo',{method:'POST',body:{},token:admin.token})).body.added,0);
 }finally{await f.close();}
});
