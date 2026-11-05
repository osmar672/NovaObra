import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {verifySchema} from '../schema.js';
import {check} from '../middlewares/validaciones.js';
const brandName='Catálogo de demostración';
export async function addDemoCatalog(pool,database,operatorId=null){
 const entries=JSON.parse(await readFile(new URL('../../../database/catalogo-demo.json',import.meta.url),'utf8'));
 const c=await pool.getConnection();let locked=false,started=false;
 const lock='novaobra_demo_'+createHash('sha256').update(database).digest('hex').slice(0,32);
 try{
  await verifySchema(c,database);
  const [[result]]=await c.execute('SELECT GET_LOCK(?,10) AS acquired',[lock]);
  check(result.acquired===1,'Otra carga está en curso. Intenta nuevamente.',409);locked=true;
  await c.beginTransaction();started=true;
  const [[operator]]=operatorId?await c.execute('SELECT id FROM usuarios WHERE id=? AND activo=1 AND rol_id=1 FOR SHARE',[operatorId]):await c.query('SELECT id FROM usuarios WHERE activo=1 AND rol_id=1 ORDER BY id LIMIT 1 FOR SHARE');
  check(operator,'Primero crea el administrador web con npm run admin:create.');
  const lookup=async(table,name,description)=>{
   const [[existing]]=await c.execute(`SELECT id FROM ${table} WHERE nombre=?`,[name]);
   if(existing)return existing.id;
   const [created]=await c.execute(`INSERT INTO ${table} (nombre,descripcion) VALUES (?,?)`,[name,description]);return created.insertId;
  };
  const brand=await lookup('marcas',brandName,'Datos ficticios para probar NovaObra. Fotografías de referencia, precios y existencias de ejemplo.');
  let added=0;const categories=new Map();
  const start=new Date(Date.now()-86400000),end=new Date(Date.now()+90*86400000);
  for(const p of entries){
   const [[existing]]=await c.execute('SELECT id FROM productos WHERE sku=?',[p.sku]);
   if(existing)continue;
   if(!categories.has(p.categoria))categories.set(p.categoria,await lookup('categorias',p.categoria,p.categoria_descripcion));
   const offer=p.oferta?Math.round(p.precio*.9):null;
   const [created]=await c.execute('INSERT INTO productos (categoria_id,marca_id,sku,nombre,descripcion,especificaciones,imagen,precio,precio_oferta,oferta_inicio,oferta_fin,destacado,activo) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1)',[categories.get(p.categoria),brand,p.sku,p.nombre,p.descripcion,p.especificaciones,'',p.precio,offer,p.oferta?start:null,p.oferta?end:null,p.destacado]);
   await c.execute('INSERT INTO inventario (producto_id,existencia,minimo) VALUES (?,?,?)',[created.insertId,p.existencia,p.minimo]);
   await c.execute('INSERT INTO movimientos_inventario (producto_id,usuario_id,cantidad,motivo) VALUES (?,?,?,?)',[created.insertId,operator.id,p.existencia,'Carga inicial de catálogo de demostración']);
   added++;
  }
  await c.commit();started=false;
  return {added,skipped:entries.length-added,total:entries.length,operatorId:operator.id};
 }catch(error){if(started)await c.rollback();throw error;}
 finally{try{if(locked)await c.execute('SELECT RELEASE_LOCK(?)',[lock]);}finally{c.release();}}
}
