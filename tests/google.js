import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,available} from './helpers.js';
import {oauthFixture} from './google-provider.js';
import {openOAuthTransaction,sealOAuthTransaction} from '../backend/src/services/googleOAuth.js';
import {setup} from '../backend/src/schema.js';
test('Google: autorización real, PKCE, nonce, cuenta cliente y sesión propia con refresh',{skip:!available,timeout:20000},async()=>{
 const f=await oauthFixture();try{
  const start=await f.begin({returnTo:'/carrito'});assert.equal(start.status,200);
  const url=new URL(start.body.url);assert.equal(url.origin,'https://accounts.google.com');assert.equal(url.searchParams.get('response_type'),'code');assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert.ok(url.searchParams.get('nonce'));assert.equal(url.searchParams.get('redirect_uri'),f.config.google.redirectUri);assert.deepEqual(url.searchParams.get('scope').split(' ').sort(),['email','openid','profile']);
  assert.match(start.headers.get('set-cookie'),/HttpOnly/);assert.match(start.headers.get('set-cookie'),/SameSite=Lax/);assert.match(start.headers.get('set-cookie'),/Path=\/api\/auth\/google/);
  const authCode=f.code(start,{rol:'administrador'}),googleToken=f.codes.get(authCode).token;
  assert.equal((await f.request('/api/auth/me',{token:googleToken})).status,401);
  const login=await f.callback(start,{code:authCode});assert.equal(login.status,303);assert.ok(login.cookie);assert.match(login.location,/\/auth\/google\/complete\?next=%2Fcarrito$/);assert.ok(!/token=/.test(login.location));assert.ok(login.cookies.some(c=>c.startsWith('novaobra_google_oauth=;')));
  assert.match((await f.callback(start,{code:authCode})).location,/google_error=provider/);
  const session=await f.restore(login.cookie);assert.equal(session.status,200);assert.equal(session.body.usuario.rol,'cliente');assert.equal(session.body.usuario.email,'google@example.test');assert.ok(session.body.token);assert.equal(session.body.password_hash,undefined);
  assert.equal((await f.request('/api/admin/dashboard',{token:session.body.token})).status,403);
  assert.deepEqual((await f.request('/api/auth/google/status',{token:session.body.token})).body,{enabled:true,linked:true,localPassword:false});
  const [[user]]=await f.pool.query("SELECT password_hash,password_local FROM usuarios WHERE email='google@example.test'");assert.match(user.password_hash,/^scrypt\$/);assert.equal(user.password_local,0);
  const again=await f.begin();const returned=await f.callback(again,{code:f.code(again)});assert.equal(returned.status,303);assert.equal((await f.restore(returned.cookie)).body.usuario.id,session.body.usuario.id);
  assert.equal((await f.pool.query("SELECT COUNT(*) AS n FROM usuarios WHERE email='google@example.test'"))[0][0].n,1);
 }finally{await f.close();}
});
test('Google: CSRF, estado alterado/vencido, cancelación, nonce, firma, issuer, audiencia y correo verificado',{skip:!available,timeout:20000},async()=>{
 const f=await oauthFixture();try{
  assert.equal((await f.begin({origin:'https://evil.test'})).status,403);assert.equal((await f.begin({header:false})).status,403);
  let start=await f.begin();assert.match((await f.callback(start,{state:'alterado',code:'bad'})).location,/google_error=state/);assert.equal(f.calls(),0);
  const tx=openOAuthTransaction(start.cookie.split('=')[1],f.config.secret);tx.expires=Date.now()-1;
  assert.match((await f.callback(start,{code:'bad',cookie:'novaobra_google_oauth='+sealOAuthTransaction(tx,f.config.secret)})).location,/google_error=state/);
  start=await f.begin();assert.match((await f.callback(start,{error:'access_denied'})).location,/google_error=cancelled/);
  for(const [claims,reason]of [[{nonce:'incorrecto'},'nonce'],[{aud:'otra-aplicacion'},'provider'],[{iss:'https://evil.test'},'provider'],[{exp:Math.floor(Date.now()/1000)-3600},'provider'],[{email_verified:false},'unverified']]){
   start=await f.begin();const result=await f.callback(start,{code:f.code(start,claims)});assert.match(result.location,new RegExp('google_error='+reason));assert.equal(result.cookie,undefined);
  }
  start=await f.begin();const bad=f.code(start);f.codes.get(bad).token=f.codes.get(bad).token.slice(0,-8)+'xxxxxxxx';assert.match((await f.callback(start,{code:bad})).location,/google_error=provider/);
  assert.equal((await f.pool.query('SELECT COUNT(*) AS n FROM identidades_google'))[0][0].n,0);
 }finally{await f.close();}
});
test('Google: no unión por correo; vinculación con contraseña, versiones y cuenta activa',{skip:!available,timeout:20000},async()=>{
 const f=await oauthFixture();try{
  let start=await f.begin();assert.match((await f.callback(start,{code:f.code(start,{email:'admin@example.test'})})).location,/google_error=email_exists/);
  const login=await f.login('admin@example.test'),token=login.body.token;
  assert.equal((await f.begin({token,password:'incorrecta'})).status,401);
  start=await f.begin({token,password:f.password});assert.equal(start.status,200);
  assert.match((await f.callback(start,{code:f.code(start,{email:'diferente@example.test'})})).location,/google_error=different_email/);
  start=await f.begin({token,password:f.password});const linked=await f.callback(start,{code:f.code(start,{email:'admin@example.test'})});assert.ok(linked.cookie);
  const restored=await f.restore(linked.cookie);assert.equal(restored.body.usuario.id,login.body.usuario.id);assert.equal(restored.body.usuario.rol,'administrador');
  assert.deepEqual((await f.request('/api/auth/google/status',{token:restored.body.token})).body,{enabled:true,linked:true,localPassword:true});
  start=await f.begin();const signedIn=await f.callback(start,{code:f.code(start,{email:'admin@example.test'})});assert.ok(signedIn.cookie);
  const fresh=await f.restore(signedIn.cookie);start=await f.begin({token:fresh.body.token,password:f.password});await f.pool.query('UPDATE usuarios SET version_sesion=version_sesion+1 WHERE id=?',[login.body.usuario.id]);assert.match((await f.callback(start,{code:f.code(start,{email:'admin@example.test'})})).location,/google_error=link_expired/);
  await f.pool.query('UPDATE usuarios SET activo=0 WHERE id=?',[login.body.usuario.id]);start=await f.begin();assert.match((await f.callback(start,{code:f.code(start,{email:'admin@example.test'})})).location,/google_error=inactive/);
 }finally{await f.close();}
});
test('Google deshabilitado y migración de once tablas conservan las cuentas y sus contraseñas',{skip:!available,timeout:15000},async()=>{
 const f=await fixture();try{
  assert.deepEqual((await f.request('/api/auth/options')).body,{googleEnabled:false});
  assert.equal((await f.request('/api/auth/google/start',{method:'POST',body:{}})).status,503);
  const [before]=await f.pool.query('SELECT id,email,password_hash,rol_id,activo FROM usuarios ORDER BY id');
  await f.pool.query('DROP TABLE identidades_google');await f.pool.query('ALTER TABLE usuarios DROP COLUMN password_local');
  await setup(f.admin,f.database);assert.deepEqual((await f.pool.query('SELECT id,email,password_hash,rol_id,activo FROM usuarios ORDER BY id'))[0],before);
  assert.ok((await f.pool.query('SELECT password_local FROM usuarios'))[0].every(u=>u.password_local===1));
 }finally{await f.close();}
});
