import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {refreshCookie} from '../backend/src/middlewares/authMiddleware.js';
test('Cookie de sesión: HttpOnly, SameSite, Secure en producción y borrado con el mismo alcance',async()=>{
 const app=express();
 app.get('/:action/:production',(req,res)=>{refreshCookie(res,'jwt_de_prueba',req.params.production==='1',new Date(Date.now()+604800000),req.params.action==='clear');res.json({ok:true});});
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
 try{
  for(const production of ['0','1']){
   const base=`http://127.0.0.1:${server.address().port}`;
   const issued=(await fetch(base+'/set/'+production)).headers.get('set-cookie');
   assert.match(issued,/novaobra_refresh=jwt_de_prueba/);assert.match(issued,/HttpOnly/);assert.match(issued,/SameSite=Lax/);assert.match(issued,/Path=\//);assert.match(issued,/Max-Age=604[78]\d{2}/);
   assert.equal(/; Secure(?:;|$)/.test(issued),production==='1');
   const removed=(await fetch(base+'/clear/'+production)).headers.get('set-cookie');
   assert.match(removed,/novaobra_refresh=;/);assert.match(removed,/HttpOnly/);assert.match(removed,/SameSite=Lax/);assert.match(removed,/Expires=Thu, 01 Jan 1970/);assert.equal(/; Secure(?:;|$)/.test(removed),production==='1');
  }
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
