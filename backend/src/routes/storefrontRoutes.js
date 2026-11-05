import {Router} from 'express';
import {catalog,productSelect,visibleSQL} from '../services/catalog.js';
import {check,id} from '../middlewares/validaciones.js';
const fields=['id','categoria_id','marca_id','sku','nombre','descripcion','especificaciones','imagen','precio','precio_actual','marca','categoria','existencia'];
const storefrontProduct=row=>Object.fromEntries(fields.map(key=>[key,row[key]]));
export function storefrontRoutes(pool){
 const router=Router();
 for(const table of ['categorias','marcas'])router.get('/'+table,async(_req,res)=>{
  const [rows]=await pool.query(`SELECT id,nombre,descripcion FROM ${table} WHERE activo=1 ORDER BY nombre`);res.json(rows);
 });
 router.get('/productos',async(req,res)=>{const result=await catalog(pool,req.query,false);res.json({...result,items:result.items.map(storefrontProduct)});});
 router.get('/productos/:id',async(req,res)=>{const [[row]]=await pool.execute(`${productSelect} WHERE p.id=? AND ${visibleSQL}`,[id(req.params.id)]);check(row,'Producto no encontrado.',404);res.json(storefrontProduct(row));});
 return router;
}
