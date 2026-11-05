import { check, text, integer, id, flag, transaction } from '../middlewares/validaciones.js';
import { saveProduct, productSelect, visibleSQL } from '../services/catalog.js';
import { createOrder, orders } from '../services/orders.js';
export const definitions = {
  categorias: { pk:'id', fields:{ nombre:['text',100], descripcion:['optional',500], activo:['flag'] } },
  marcas: { pk:'id', fields:{ nombre:['text',100], descripcion:['optional',500], activo:['flag'] } },
  productos: { pk:'id', fields:{ categoria_id:['id'],marca_id:['id'],sku:['text',60],nombre:['text',160],descripcion:['optional',10000],especificaciones:['optional',10000],imagen:['optional',1000],precio:['money'],precio_oferta:['optionalMoney'],oferta_inicio:['optional',30],oferta_fin:['optional',30],destacado:['flag'],activo:['flag'],minimo:['integer',0,1000000] }, refs:{categoria_id:'categorias',marca_id:'marcas'} },
  clientes: { pk:'id',fields:{usuario_id:['id'],telefono:['optional',30],direccion:['optional',500]},refs:{usuario_id:'usuarios'} },
  inventario: {pk:'producto_id',fields:{producto_id:['id'],existencia:['integer',0,2147483647],minimo:['integer',0,1000000]},refs:{producto_id:'productos'}},
  pedidos: {pk:'id',fields:{cliente_id:['id'],clave:['text',64],tipo:['enum','pedido','cotizacion'],entrega:['enum','retiro','domicilio'],direccion:['optional',500],telefono:['text',30],nota:['optional',1000]},refs:{cliente_id:'clientes'}},
  detalle_pedidos:{pk:'id',fields:{pedido_id:['id'],producto_id:['id'],cantidad:['integer',1,10000]},refs:{pedido_id:'pedidos',producto_id:'productos'}},
  movimientos_inventario:{pk:'id',fields:{producto_id:['id'],cantidad:['integer',-100000,100000],motivo:['text',200]},refs:{producto_id:'productos'}},
};
export const staff = user => ['administrador','empleado'].includes(user.rol);
function parse(body, definition, partial = false) {
  check(body && typeof body==='object' && !Array.isArray(body),'Objeto JSON requerido.');
  check(Object.keys(body).every(key=>key in definition.fields),'Campos no permitidos.');
  const out={};
  for (const [key,[kind,...args]] of Object.entries(definition.fields)) {
    const value=body[key];
    if (partial && value===undefined) continue;
    if (kind==='id') out[key]=id(value);
    else if (kind==='flag') out[key]=flag(value,true);
    else if (kind==='integer') out[key]=integer(value??(key==='minimo'?5:0),key,...args);
    else if (kind==='enum') {check(args.includes(value),`${key}: valor no válido.`);out[key]=value;}
    else out[key]=text(value??'',key,args[0]||160,kind==='text');
  }
  return out;
}
async function refs(c, def, data) {
  for (const [key,table] of Object.entries(def.refs||{})) {
    if(data[key]===undefined)continue;
    const [[row]]=await c.execute(`SELECT id FROM ${table} WHERE id=?`,[id(data[key])]);
    check(row,`${key}: el registro relacionado no existe.`,404);
  }
}
async function one(c, name, n, lock=false) {
  const [[row]]=await c.execute(`SELECT * FROM ${name} WHERE ${definitions[name].pk}=?${lock?' FOR UPDATE':''}`,[n]);
  check(row,'Registro no encontrado.',404); return row;
}
async function stock(c, deltas) {
  for(const [product,delta] of [...deltas].sort((a,b)=>a[0]-b[0])) {
    const [[row]]=await c.execute('SELECT existencia FROM inventario WHERE producto_id=? FOR UPDATE',[product]);
    check(row,'El producto no tiene inventario.',409);
    check(row.existencia+delta>=0 && row.existencia+delta<=2147483647,'Existencias insuficientes o fuera de rango.',409);
    await c.execute('UPDATE inventario SET existencia=existencia+? WHERE producto_id=?',[delta,product]);
  }
}
async function movement(c,user,product,delta,reason,order=null) {
  if(delta)await c.execute('INSERT INTO movimientos_inventario (producto_id,usuario_id,pedido_id,cantidad,motivo) VALUES (?,?,?,?,?)',[product,user.id,order,delta,reason]);
}
export function model(name,pool,config) {
 const def=definitions[name];
 return {
  async list(user) {
    if(name==='pedidos')return orders(pool,user,staff(user));
    const [rows]=await pool.query(`SELECT * FROM ${name} ORDER BY ${def.pk} DESC`);return rows;
  },
  async read(n,user) {
    const row=await one(pool,name,n);
    if(name==='pedidos'&&!staff(user)) {
      const [[owner]]=await pool.execute('SELECT usuario_id FROM clientes WHERE id=?',[row.cliente_id]);
      check(owner?.usuario_id===user.id,'Registro no encontrado.',404);
    }
    return row;
  },
  async save(body,n,user) {
    if(name==='productos') {
      const result=await saveProduct(pool,body,n);return one(pool,name,result.id);
    }
    if(name==='pedidos'&&!n) {
      let customer=user;
      if(staff(user)) {
        const [[client]]=await pool.execute('SELECT usuario_id FROM clientes WHERE id=?',[id(body.cliente_id)]);
        check(client,'Cliente inexistente.',404);customer={id:client.usuario_id};
      }
      const result=await createOrder(pool,config,customer,body,user);
      return {...await one(pool,name,result.id),repetido:result.repetido};
    }
    return transaction(pool,async c=>{
      if(name==='pedidos') {
        const row=await one(c,name,n,true);
        check(row.estado==='pendiente','Solo se edita un pedido pendiente.',409);
        const allowed=['entrega','direccion','telefono','nota'];
        check(Object.keys(body).every(k=>allowed.includes(k)),'Solo se editan los datos de entrega; las líneas tienen su propio CRUD.');
        const data=parse(body,{fields:Object.fromEntries(allowed.map(k=>[k,def.fields[k]]))},true);
        check(Object.keys(data).length,'Envía al menos un campo.');
        const merged={...row,...data};
        check(merged.entrega!=='domicilio'||config.business.deliveryFee!==null,'Domicilio no habilitado.');
        if(merged.entrega==='domicilio')text(merged.direccion,'Dirección',500);
        data.costo_entrega=merged.entrega==='domicilio'?config.business.deliveryFee:0;
        const keys=Object.keys(data);await c.execute(`UPDATE pedidos SET ${keys.map(k=>`${k}=?`).join(',')} WHERE id=?`,[...keys.map(k=>data[k]),n]);
        return one(c,name,n);
      }
      const data=parse(body,def,n!==undefined);
      check(Object.keys(data).length,'Envía al menos un campo.');
      await refs(c,def,data);
      let old=n?await one(c,name,n,true):null;
      if(name==='detalle_pedidos') {
        const merged={...old,...data};
        if(old)check(merged.pedido_id===old.pedido_id,'No se puede mover una línea a otro pedido.');
        const order=await one(c,'pedidos',merged.pedido_id,true);
        check(order.estado==='pendiente','Solo se editan detalles de pedidos pendientes.',409);
        const [[p]]=await c.execute(`${productSelect} WHERE p.id=? AND ${visibleSQL}`,[merged.producto_id]);
        check(p,'Producto no disponible.',404);
        data.precio_unitario=old&&old.producto_id===merged.producto_id?old.precio_unitario:p.precio_actual;
        if(order.tipo==='pedido') {
          const deltas=new Map();
          if(old)deltas.set(old.producto_id,old.cantidad);
          deltas.set(merged.producto_id,(deltas.get(merged.producto_id)||0)-merged.cantidad);
          await stock(c,deltas);
          for(const [product,delta]of deltas)await movement(c,user,product,delta,'Edición de detalle',order.id);
        }
      }
      if(name==='movimientos_inventario') {
        check(!old?.pedido_id,'El movimiento de un pedido es inmutable; usa su flujo de cancelación.',409);
        const merged={...old,...data};check(merged.cantidad!==0,'Cantidad no puede ser cero.');
        const deltas=new Map();if(old)deltas.set(old.producto_id,-old.cantidad);
        deltas.set(merged.producto_id,(deltas.get(merged.producto_id)||0)+merged.cantidad);
        await stock(c,deltas);data.usuario_id=user.id;
      }
      if(name==='inventario') {
        if(old) {
          check(data.producto_id===undefined||data.producto_id===n,'No se cambia el producto del inventario.');
          const target=data.existencia??old.existencia;
          await movement(c,user,n,target-old.existencia,'Ajuste de inventario');
        } else if(data.existencia)await movement(c,user,data.producto_id,data.existencia,'Alta de inventario');
      }
      const keys=Object.keys(data);
      if(n)await c.execute(`UPDATE ${name} SET ${keys.map(k=>`${k}=?`).join(',')} WHERE ${def.pk}=?`,[...keys.map(k=>data[k]),n]);
      else {
        const [result]=await c.execute(`INSERT INTO ${name} (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`,keys.map(k=>data[k]));
        n=def.pk==='producto_id'?data.producto_id:result.insertId;
      }
      return one(c,name,n);
    });
  },
  async remove(n,user) {
    return transaction(pool,async c=>{
      const row=await one(c,name,n,true);
      if(name==='movimientos_inventario') {
        check(!row.pedido_id,'Los movimientos vinculados a pedidos son inmutables.',409);
        await stock(c,new Map([[row.producto_id,-row.cantidad]]));
      }
      if(name==='inventario') {
        check(row.existencia===0,'No se elimina inventario con existencias.',409);
        const [[used]]=await c.execute('SELECT COUNT(*) n FROM movimientos_inventario WHERE producto_id=?',[n]);
        check(!used.n,'El inventario tiene historial asociado.',409);
      }
      if(name==='pedidos')check(['pendiente','cancelado'].includes(row.estado),'El estado no permite eliminar el pedido.',409);
      if(name==='detalle_pedidos') {
        const order=await one(c,'pedidos',row.pedido_id,true);
        check(order.estado==='pendiente','Solo se eliminan detalles de pedidos pendientes.',409);
        if(order.tipo==='pedido') {await stock(c,new Map([[row.producto_id,row.cantidad]]));await movement(c,user,row.producto_id,row.cantidad,'Eliminación de detalle',order.id);}
      }
      if(name==='productos') {
        const [[history]]=await c.execute('SELECT COUNT(*) n FROM movimientos_inventario WHERE producto_id=?',[n]);
        const [[details]]=await c.execute('SELECT COUNT(*) n FROM detalle_pedidos WHERE producto_id=?',[n]);
        const [[inventory]]=await c.execute('SELECT existencia FROM inventario WHERE producto_id=? FOR UPDATE',[n]);
        check(!history.n&&!details.n&&!inventory?.existencia,'El producto tiene existencias o historial.',409);
        await c.execute('DELETE FROM inventario WHERE producto_id=?',[n]);
      }
      await c.execute(`DELETE FROM ${name} WHERE ${def.pk}=?`,[n]);
    });
  },
 };
}
