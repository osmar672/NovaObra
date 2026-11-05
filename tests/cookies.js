import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import {fixture,available} from './helpers.js';
test('Cookies reales: restauración sin renovar JWT, CSRF, revocación y logout', {skip:!available,timeout:20000},async()=>{
 const f=await fixture();
 async function restore(cookie,{origin=f.config.publicUrl,header=true}={}){
  const headers={'Content-Type':'application/json'};
  if(cookie)headers.Cookie=cookie;if(origin)headers.Origin=origin;if(header)headers['X-NovaObra-Request']='1';
  const r=await fetch(f.base+'/api/auth/session',{method:'POST',headers,body:'{}'});
  return {status:r.status,body:await r.json(),headers:r.headers};
 }
 try{
  const login=await f.login('admin@example.test'),cookie=login.cookie,token=login.body.token;
  const restored=await restore(cookie);assert.equal(restored.status,200);assert.equal(restored.body.token,token);assert.equal(restored.headers.get('set-cookie'),null);
  assert.equal(jwt.decode(restored.body.token).exp,jwt.decode(token).exp);assert.ok(!('password_hash' in restored.body.usuario));
  const cookieOnly=await fetch(f.base+'/api/categorias',{headers:{Cookie:cookie}});assert.equal(cookieOnly.status,401);assert.deepEqual(await cookieOnly.json(),{error:'No autorizado'});
  assert.equal((await f.request('/api/categorias',{token:restored.body.token})).status,200);
  for(const opts of [{origin:'https://ajeno.example'},{origin:null},{header:false}])assert.equal((await restore(cookie,opts)).status,403);
  for(const value of [undefined,'novaobra_session=alterado','novaobra_session=%ZZ']){const rejected=await restore(value);assert.equal(rejected.status,401);assert.match(rejected.headers.get('set-cookie'),/Expires=Thu, 01 Jan 1970/);}
  const expired=jwt.sign({v:0},f.config.secret,{algorithm:'HS256',subject:String(login.body.usuario.id),issuer:'NovaObra',audience:'NovaObra-client',expiresIn:-1});
  assert.equal((await restore('novaobra_session='+expired)).status,401);
  const logout=await f.request('/api/auth/logout',{method:'POST',body:{},token});assert.equal(logout.status,200);assert.match(logout.headers.get('set-cookie'),/novaobra_session=;/);
  assert.equal((await restore(cookie)).status,401);assert.equal((await f.request('/api/auth/me',{token})).status,401);
 }finally{await f.close();}
});
