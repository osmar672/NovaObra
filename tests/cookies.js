import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import {fixture,available} from './helpers.js';
import {refreshHash} from '../backend/src/models/sesion.js';
import {setup} from '../backend/src/schema.js';
test('Refresh: rotación, hashes, CSRF, expiración, revocación y migración conservadora',{skip:!available,timeout:20000},async()=>{
 const f=await fixture({overrides:{accessTokenSeconds:1}});
 const refresh=async(cookie,opts={})=>{const headers={'Content-Type':'application/json',Origin:opts.origin??f.config.publicUrl,'X-NovaObra-Request':'1',Cookie:cookie||''};if(opts.noHeader)delete headers['X-NovaObra-Request'];const r=await fetch(f.base+'/api/auth/refresh',{method:'POST',headers,body:'{}'});return{status:r.status,body:await r.json(),cookie:r.headers.getSetCookie()[0]?.split(';')[0]};};
 try{
  await f.pool.query('DROP TABLE sesiones_refresh');await setup(f.admin,f.database);
  assert.ok((await f.pool.query('SELECT id FROM productos'))[0].length);
  let login=await f.login('admin@example.test');let cookie=login.cookie;
  const raw=cookie.split('=')[1],[[row]]=await f.pool.query('SELECT * FROM sesiones_refresh');assert.equal(row.token_hash,refreshHash(raw));assert.ok(!JSON.stringify(row).includes(raw));
  assert.equal(jwt.decode(login.body.token).exp-jwt.decode(login.body.token).iat,1);
  for(const opts of [{origin:'https://evil.test'},{noHeader:true}])assert.equal((await refresh(cookie,opts)).status,403);
  assert.equal((await fetch(f.base+'/api/categorias',{headers:{Cookie:cookie}})).status,401);
  await new Promise(r=>setTimeout(r,1100));assert.equal((await f.request('/api/auth/me',{token:login.body.token})).status,401);
  const renewed=await refresh(cookie);assert.equal(renewed.status,200);assert.notEqual(renewed.cookie,cookie);assert.notEqual(renewed.body.token,login.body.token);
  const [[active]]=await f.pool.query('SELECT expira FROM sesiones_refresh WHERE consumido IS NULL');assert.equal(+active.expira,+row.expira);
  assert.equal((await f.request('/api/auth/me',{token:renewed.body.token})).status,200);
  assert.equal((await refresh(cookie)).status,401);assert.equal((await refresh(renewed.cookie)).status,401);assert.equal((await f.request('/api/auth/me',{token:renewed.body.token})).status,401);
  login=await f.login('admin@example.test');const concurrent=await Promise.all([refresh(login.cookie),refresh(login.cookie)]);assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,401]);
  assert.equal((await refresh(concurrent.find(r=>r.status===200).cookie)).status,401);
  login=await f.login('admin@example.test');await f.pool.query('UPDATE sesiones_refresh SET expira=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 SECOND)');assert.equal((await refresh(login.cookie)).status,401);
  login=await f.login('admin@example.test');await f.pool.execute('UPDATE usuarios SET activo=0 WHERE id=?',[login.body.usuario.id]);assert.equal((await refresh(login.cookie)).status,401);await f.pool.execute('UPDATE usuarios SET activo=1 WHERE id=?',[login.body.usuario.id]);
  login=await f.login('admin@example.test');const logout=await fetch(f.base+'/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json',Origin:f.config.publicUrl,'X-NovaObra-Request':'1',Cookie:login.cookie},body:'{}'});assert.equal(logout.status,200);assert.match(logout.headers.get('set-cookie'),/novaobra_refresh=;/);assert.equal((await refresh(login.cookie)).status,401);
  login=await f.login('admin@example.test');assert.equal((await f.request('/api/auth/password',{method:'PUT',token:login.body.token,body:{actual:f.password,nueva:'Clave nueva segura 123456'}})).status,200);assert.equal((await refresh(login.cookie)).status,401);
 }finally{await f.close();}
});
