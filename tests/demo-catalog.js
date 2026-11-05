import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,available} from './helpers.js';
import {addDemoCatalog} from '../backend/src/services/demoCatalog.js';
test('Catálogo ampliado: 48 productos, concurrencia, datos previos y cambios posteriores conservados',{skip:!available,timeout:20000},async()=>{
 const f=await fixture();
 try{
  const [before]=await f.pool.query('SELECT p.*,i.existencia,i.minimo FROM productos p JOIN inventario i ON i.producto_id=p.id ORDER BY p.id');
  const results=await Promise.all([addDemoCatalog(f.pool,f.database),addDemoCatalog(f.pool,f.database)]);
  assert.deepEqual(results.map(x=>x.added).sort((a,b)=>a-b),[0,48]);
  const [[counts]]=await f.pool.query("SELECT COUNT(*) AS n,SUM(existencia>0) AS inStock FROM productos p JOIN inventario i ON i.producto_id=p.id WHERE sku LIKE 'NV-DEMO-%'");assert.equal(counts.n,48);assert.equal(counts.inStock,48);
  const [[movements]]=await f.pool.query("SELECT COUNT(*) AS n FROM movimientos_inventario m JOIN productos p ON p.id=m.producto_id WHERE p.sku LIKE 'NV-DEMO-%'");assert.equal(movements.n,48);
  const [after]=await f.pool.query("SELECT p.*,i.existencia,i.minimo FROM productos p JOIN inventario i ON i.producto_id=p.id WHERE p.sku NOT LIKE 'NV-DEMO-%' ORDER BY p.id");assert.deepEqual(after,before);
  await f.pool.query("UPDATE productos SET nombre='Edición del operador',precio=12345,activo=0 WHERE sku='NV-DEMO-001'");
  await f.pool.query("UPDATE inventario i JOIN productos p ON p.id=i.producto_id SET i.existencia=2 WHERE p.sku='NV-DEMO-001'");
  assert.equal((await addDemoCatalog(f.pool,f.database)).added,0);
  const [[edited]]=await f.pool.query("SELECT nombre,precio,activo,existencia FROM productos p JOIN inventario i ON p.id=i.producto_id WHERE sku='NV-DEMO-001'");assert.deepEqual(edited,{nombre:'Edición del operador',precio:12345,activo:0,existencia:2});
  const login=await f.login('admin@example.test');const catalog=await f.request('/api/productos',{token:login.body.token});assert.equal(catalog.body.total,before.length+48);assert.equal(catalog.body.paginas,5);assert.equal(catalog.body.items.length,12);
 }finally{await f.close();}
});
test('Sin administrador activo no se crean productos, categorías ni marcas de ejemplo',{skip:!available,timeout:15000},async()=>{
 const f=await fixture();try{
  const [[before]]=await f.pool.query('SELECT COUNT(*) AS n FROM productos');await f.pool.query('UPDATE usuarios SET activo=0 WHERE rol_id=1');
  await assert.rejects(addDemoCatalog(f.pool,f.database),/admin:create/);
  const [[after]]=await f.pool.query('SELECT COUNT(*) AS n FROM productos');assert.equal(after.n,before.n);
  const [[brands]]=await f.pool.query("SELECT COUNT(*) AS n FROM marcas WHERE nombre='Catálogo de demostración'");assert.equal(brands.n,0);
 }finally{await f.close();}
});
test('Un fallo a mitad de carga revierte productos, inventario, movimientos y taxonomías',{skip:!available,timeout:15000},async()=>{
 const f=await fixture();try{
  const snapshot=async()=>{const out={};for(const table of ['productos','categorias','marcas','inventario','movimientos_inventario'])out[table]=(await f.pool.query(`SELECT COUNT(*) AS n FROM ${table}`))[0][0].n;return out;};
  const before=await snapshot();
  await f.pool.query("CREATE TRIGGER fail_demo BEFORE INSERT ON productos FOR EACH ROW BEGIN IF NEW.sku='NV-DEMO-004' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Fallo de prueba en carga'; END IF; END");
  await assert.rejects(addDemoCatalog(f.pool,f.database),/Fallo de prueba/);assert.deepEqual(await snapshot(),before);
  await f.pool.query('DROP TRIGGER fail_demo');assert.equal((await addDemoCatalog(f.pool,f.database)).added,48);
 }finally{await f.close();}
});
