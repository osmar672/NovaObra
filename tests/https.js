import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {request} from 'node:https';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from 'playwright-core';
import {fixture,available} from './helpers.js';
async function port(){const s=createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const n=s.address().port;await new Promise(r=>s.close(r));return n;}
test('HTTPS real: certificado validado, TLS, redirección, cookies Secure y navegación',{skip:!available,timeout:40000},async()=>{
 const f=await fixture(),dir=await mkdtemp(tmpdir()+'/novaobra-tls-');let child,browser,output='';
 try{
  const cert=dir+'/cert.crt',key=dir+'/key.key';
  const result=spawnSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-keyout',key,'-out',cert,'-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});assert.equal(result.status,0);
  const tlsPort=await port(),redirect=await port(),origin=`https://127.0.0.1:${tlsPort}`,ca=await readFile(cert);
  child=spawn(process.execPath,['backend/src/server.js'],{env:{...process.env,NODE_ENV:'production',DB_NAME:f.database,DB_USER:f.config.db.user,DB_PASSWORD:f.config.db.password,DB_HOST:f.config.db.host,DB_PORT:String(f.config.db.port),JWT_SECRET:f.config.secret,PUBLIC_URL:origin,HOST:'127.0.0.1',PORT:String(tlsPort),TLS_CERT_PATH:cert,TLS_KEY_PATH:key,HTTP_REDIRECT_PORT:String(redirect),TRUST_PROXY:''},stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);
  function call(path,{method='GET',body,cookie}={}){return new Promise((resolve,reject)=>{const req=request(origin+path,{ca,method,headers:{Origin:origin,'Content-Type':'application/json','X-NovaObra-Request':'1',...(cookie?{Cookie:cookie}:{})}},res=>{let data='';res.on('data',x=>data+=x);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,data,protocol:res.socket?.getProtocol()}));});req.on('error',reject);req.end(body===undefined?undefined:JSON.stringify(body));});}
  let ready=false;for(let i=0;i<100;i++){if(child.exitCode!==null)throw new Error(output);try{if((await call('/api/health')).status===200){ready=true;break;}}catch{}await delay(100);}assert.ok(ready,output);
  const login=await call('/api/auth/login',{method:'POST',body:{email:'admin@example.test',password:f.password}});assert.equal(login.status,200);assert.match(login.headers['strict-transport-security'],/max-age/);
  const cookie=login.headers['set-cookie'][0];assert.match(cookie,/HttpOnly/);assert.match(cookie,/; Secure/);assert.match(cookie,/Path=\/api\/auth/);
  assert.equal((await call('/api/auth/refresh',{method:'POST',body:{},cookie:cookie.split(';')[0]})).status,200);
  const redir=await fetch(`http://127.0.0.1:${redirect}/catalogo?x=1`,{redirect:'manual'});assert.equal(redir.status,308);assert.equal(redir.headers.get('location'),origin+'/catalogo?x=1');
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:process.env.CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
  // Only this isolated self-signed test context ignores browser certificate trust.
  const page=await browser.newPage({ignoreHTTPSErrors:true});
  await page.goto(origin+'/login');await page.getByLabel('Correo',{exact:true}).fill('admin@example.test');await page.getByLabel('Contraseña',{exact:true}).fill(f.password);await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/auth/login')),page.getByRole('button',{name:'Entrar',exact:true}).click()]);
  await page.waitForURL(url=>url.pathname!=='/login');
  await page.goto(origin+'/gestion/categorias');await page.getByRole('heading',{name:'Gestión de Categorías',exact:true}).waitFor();
  assert.ok((await page.context().cookies()).some(c=>c.name==='novaobra_refresh'&&c.secure&&c.httpOnly));
 }finally{if(browser)await browser.close();if(child&&child.exitCode===null){const done=once(child,'exit');child.kill('SIGTERM');await done;}await f.close();await rm(dir,{recursive:true,force:true});}
});
