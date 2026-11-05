import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import {randomUUID} from 'node:crypto';
import {fixture,available} from './helpers.js';
const entities=['categorias','marcas','productos','clientes','inventario','pedidos','detalle_pedidos','movimientos_inventario'];
test('Día 2: JWT, cuarenta endpoints, relaciones y persistencia real', {skip:!available,timeout:40000},async t=>{
 const f=await fixture();let cookie;
 async function call(path,method='GET',body,status=200,extra={}){const result=await f.request('/api'+path,{method,body,cookie,...extra});assert.equal(result.status,status,JSON.stringify(result.body));return result.body;}
 try{
  await t.test('Register/login/me: contratos, hash, duplicados y mínimo de ocho caracteres',async()=>{
   const created=await call('/auth/register','POST',{nombre:'Usuario Día 2',correo:'dia2@example.test',password:'Clave123'},201);
   assert.ok(created.id);assert.ok(created.fechaCreacion);assert.equal(created.correo,'dia2@example.test');assert.ok(!('password' in created));assert.ok(!('password_hash' in created));assert.ok(!('token' in created));
   await call('/auth/register','POST',{nombre:'Duplicado',correo:'dia2@example.test',password:'Clave123'},400);
   await call('/auth/register','POST',{nombre:'Inválido',correo:'mal',password:'1234567'},400);
   const login=await call('/auth/login','POST',{correo:'dia2@example.test',password:'Clave123'});assert.ok(login.token);assert.equal(jwt.decode(login.token,{complete:true}).header.alg,'HS256');
   const me=await call('/auth/me','GET',undefined,200,{token:login.token});assert.equal(me.id,created.id);assert.ok(!JSON.stringify(me).includes('password'));
   await call('/auth/login','POST',{correo:'dia2@example.test',password:'incorrecta'},401);
   await call('/auth/me','GET',undefined,401);
   const [[stored]]=await f.pool.execute('SELECT password_hash FROM usuarios WHERE id=?',[created.id]);assert.match(stored.password_hash,/^scrypt\$/);assert.notEqual(stored.password_hash,'Clave123');
  });
  await t.test('Las cinco operaciones de las ocho entidades rechazan ausencia de Bearer y tokens inválidos',async()=>{
   const valid=(await f.login('admin@example.test')).body.token;
   const invalidTokens=['manipulado',valid.slice(0,-4)+'xxxx',jwt.sign({sub:'1',v:0},f.config.secret,{algorithm:'HS256',expiresIn:-1,issuer:'NovaObra',audience:'NovaObra-client'}),jwt.sign({sub:'1',v:0},f.config.secret,{algorithm:'HS384',issuer:'NovaObra',audience:'NovaObra-client'})];
   for(const name of entities)for(const [method,suffix] of [['GET',''],['GET','/1'],['POST',''],['PUT','/1'],['DELETE','/1']]){
    const path='/'+name+suffix;
    const absent=await call(path,method,['POST','PUT','DELETE'].includes(method)?{}:undefined,401);assert.deepEqual(absent,{error:'No autorizado'});
    for(const token of invalidTokens)await call(path,method,['POST','PUT','DELETE'].includes(method)?{}:undefined,401,{token});
   }
   cookie=(await f.login('admin@example.test')).cookie;
  });
  await t.test('CRUD de las ocho entidades, selectores y relaciones inválidas',async()=>{
   for(const name of entities)await call('/'+name+'/4294967295','GET',undefined,404);
   const admin=(await call('/auth/me')).id;
   const cat=await call('/categorias','POST',{nombre:'Categoría Día2',descripcion:'Prueba',activo:true},201);
   const brand=await call('/marcas','POST',{nombre:'Marca Día2',descripcion:'Prueba',activo:true},201);
   await call('/categorias/'+cat.id,'PUT',{nombre:'Categoría editada'});
   assert.equal((await call('/categorias/'+cat.id)).nombre,'Categoría editada');
   await call('/marcas/'+brand.id,'PUT',{nombre:'Marca editada'});await call('/marcas/'+brand.id);
   const body={categoria_id:cat.id,marca_id:brand.id,sku:'DIA2-1',nombre:'Producto Día2',precio:10,minimo:0};
   await call('/productos','POST',{...body,categoria_id:4294967295},404);
   await call('/categorias','POST',{nombre:''},400);
   const p=await call('/productos','POST',body,201);
   const p2=await call('/productos','POST',{...body,sku:'DIA2-2'},201);
   await call('/productos/'+p.id,'PUT',{...body,nombre:'Producto editado'});
   assert.equal((await call('/productos/'+p.id)).nombre,'Producto editado');
   await call('/categorias/'+cat.id,'DELETE',{},409);await call('/marcas/'+brand.id,'DELETE',{},409);
   const client=await call('/clientes','POST',{usuario_id:admin,telefono:'123',direccion:''},201);
   await call('/clientes/'+client.id,'PUT',{telefono:'456'});assert.equal((await call('/clientes/'+client.id)).telefono,'456');
   await call('/inventario/'+p.id,'DELETE',{},204);
   assert.equal((await call('/productos/'+p.id)).id,p.id);
   assert.ok((await call('/productos')).items.some(row=>row.id===p.id));
   await call('/inventario','POST',{producto_id:p.id,existencia:0,minimo:1},201);
   await call('/inventario/'+p.id,'PUT',{minimo:2});assert.equal((await call('/inventario/'+p.id)).minimo,2);
   const movement=await call('/movimientos_inventario','POST',{producto_id:p.id,cantidad:5,motivo:'Entrada manual'},201);
   await call('/movimientos_inventario/'+movement.id,'PUT',{cantidad:3,motivo:'Corrección manual'});await call('/movimientos_inventario/'+movement.id);
   assert.equal((await call('/inventario/'+p.id)).existencia,3);
   await call('/movimientos_inventario/'+movement.id,'DELETE',{},204);assert.equal((await call('/inventario/'+p.id)).existencia,0);
   const order=await call('/pedidos','POST',{cliente_id:client.id,clave:randomUUID(),tipo:'cotizacion',entrega:'retiro',telefono:'123',lineas:[{producto_id:p.id,cantidad:1}]},201);
   await call('/pedidos/'+order.id,'PUT',{telefono:'987'});assert.equal((await call('/pedidos/'+order.id)).telefono,'987');
   await call('/clientes/'+client.id,'DELETE',{},409);await call('/pedidos/'+order.id,'DELETE',{},409);
   const existing=(await call('/detalle_pedidos')).find(d=>d.pedido_id===order.id);
   await call('/detalle_pedidos/'+existing.id,'DELETE',{},204);
   const detail=await call('/detalle_pedidos','POST',{pedido_id:order.id,producto_id:p2.id,cantidad:1},201);
   await call('/detalle_pedidos/'+detail.id,'PUT',{cantidad:2});assert.equal((await call('/detalle_pedidos/'+detail.id)).cantidad,2);
   await call('/detalle_pedidos/'+detail.id,'DELETE',{},204);
   await call('/pedidos/'+order.id,'DELETE',{},204);await call('/clientes/'+client.id,'DELETE',{},204);
   await call('/inventario/'+p.id,'DELETE',{},204);
   await call('/productos/'+p.id,'DELETE',{},204);await call('/productos/'+p2.id,'DELETE',{},204);
   await call('/marcas/'+brand.id,'DELETE',{},204);await call('/categorias/'+cat.id,'DELETE',undefined,204);
   for(const name of entities)await call('/'+name);
  });
  await t.test('Editar detalles reservados conserva stock y protege movimientos de pedidos',async()=>{
   await f.pool.execute('UPDATE inventario SET existencia=10 WHERE producto_id IN (1,2)');
   const [[client]]=await f.pool.query("SELECT c.id FROM clientes c JOIN usuarios u ON u.id=c.usuario_id WHERE u.email='dia2@example.test'");
   const body={cliente_id:client.id,clave:randomUUID(),tipo:'pedido',entrega:'retiro',telefono:'123',lineas:[{producto_id:1,cantidad:2}]};
   const order=await call('/pedidos','POST',body,201);
   await call('/pedidos','POST',body,200);
   let detail=(await call('/detalle_pedidos')).find(d=>d.pedido_id===order.id);
   await call('/detalle_pedidos/'+detail.id,'PUT',{cantidad:3});
   assert.equal((await call('/inventario/1')).existencia,7);
   const added=await call('/detalle_pedidos','POST',{pedido_id:order.id,producto_id:2,cantidad:1},201);
   assert.equal((await call('/inventario/2')).existencia,9);
   await call('/detalle_pedidos/'+detail.id,'DELETE',undefined,204);
   assert.equal((await call('/inventario/1')).existencia,10);
   await call('/admin/pedidos/'+order.id,'PATCH',{estado:'cancelado'});
   assert.equal((await call('/inventario/2')).existencia,10);
   const historical=(await call('/movimientos_inventario')).find(m=>m.pedido_id===order.id);
   await call('/movimientos_inventario/'+historical.id,'PUT',{cantidad:1},409);
   await call('/movimientos_inventario/'+historical.id,'DELETE',undefined,409);
   await call('/detalle_pedidos/'+added.id,'PUT',{cantidad:4},409);
  });
  await t.test('Restricciones heredadas: clientes sin acceso a gestión y sesiones revocadas',async()=>{
   const customer=await f.request('/api/auth/login',{method:'POST',body:{correo:'dia2@example.test',password:'Clave123'}});
   await call('/categorias','POST',{nombre:'No permitido'},403,{cookie:customer.cookie});
   await call('/auth/logout','POST',{},200,{cookie:customer.cookie});
   await call('/auth/me','GET',undefined,401,{cookie:customer.cookie});
  });
 }finally{await f.close();}
});
