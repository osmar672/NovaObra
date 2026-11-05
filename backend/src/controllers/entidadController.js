import { model } from '../models/entidades.js';
import { id } from '../middlewares/validaciones.js';
export function entidadController(name,pool,config,provided) {
 const m=provided || model(name,pool,config);
 return {
  list:async(req,res)=>res.json(await m.list(req.user)),
  read:async(req,res)=>res.json(await m.read(id(req.params.id),req.user)),
  create:async(req,res)=>{const result=await m.save(req.body,undefined,req.user);res.status(result.repetido?200:201).json(result);},
  update:async(req,res)=>res.json(await m.save(req.body,id(req.params.id),req.user)),
  remove:async(req,res)=>{await m.remove(id(req.params.id),req.user);res.sendStatus(204);},
 };
}
