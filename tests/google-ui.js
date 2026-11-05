import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {available} from './helpers.js';
import {oauthFixture} from './google-provider.js';
test('Navegador Google: redirección, cookies, cuenta nueva, vinculación y acceso posterior',{skip:!available,timeout:60000},async()=>{
 const f=await oauthFixture();let vite,browser,identity='customer';const errors=[];
 try{
  vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','frontend/vite.config.js'],{cwd:new URL('../',import.meta.url),env:{...process.env,HOST:'127.0.0.1',PORT:new URL(f.base).port},stdio:['ignore','pipe','pipe']});
  let output='';vite.stdout.on('data',x=>output+=x);vite.stderr.on('data',x=>output+=x);
  for(let i=0;i<100;i++){if(vite.exitCode!==null)throw new Error(output);try{if((await fetch(f.config.publicUrl+'/api/health')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:process.env.CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
  const page=await browser.newPage();page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
  // Provider transport is simulated; NovaObra's full browser/server flow and official signature verification run normally.
  await page.route('https://accounts.google.com/**',async route=>{
   const url=new URL(route.request().url()),start={body:{url:url.href}};
   const claims=identity==='admin'?{sub:'google-web-admin',email:'admin@example.test',name:'Google admin'}:{sub:'google-web-customer',email:'google-web@example.test',name:'Cliente Google web'};
   const code=f.code(start,claims),callback=new URL(f.config.google.redirectUri);callback.searchParams.set('state',url.searchParams.get('state'));callback.searchParams.set('code',code);
   await route.fulfill({status:302,headers:{location:callback.href},body:''});
  });
  await page.goto(f.config.publicUrl);
  await page.locator('.discovery-count strong').filter({hasText:'7'}).waitFor();
  assert.equal(await page.locator('.product-card').count(),7);
  const item=(await f.request('/api/tienda/productos')).body.items[0];
  const card=page.locator('.product-card').filter({has:page.getByRole('heading',{name:item.nombre,exact:true})});
  assert.equal(await card.locator('.product-description').innerText(),item.descripcion);
  const shownPrice=await card.locator('.price strong').innerText();
  assert.equal(shownPrice.replace(/[^0-9]/g,''),new Intl.NumberFormat('es-CR',{style:'currency',currency:'CRC',maximumFractionDigits:2}).format(Number(item.precio_actual)).replace(/[^0-9]/g,''));
  await card.getByRole('link',{name:'Ver producto y descripción completa'}).click();await page.getByRole('heading',{name:item.nombre,exact:true}).waitFor();assert.equal(new URL(page.url()).pathname.startsWith('/producto/'),true);
  assert.equal(await page.getByRole('button',{name:'Cargar 48 productos de ejemplo'}).count(),0);
  await page.goto(f.config.publicUrl+'/login');await page.getByRole('button',{name:'Continuar con Google',exact:true}).click();await page.waitForURL(u=>u.pathname==='/catalogo');
  await page.goto(f.config.publicUrl+'/cuenta');await page.getByRole('heading',{name:'Hola, Cliente Google web',exact:true}).waitFor();await page.getByText('Tu cuenta de Google está vinculada.',{exact:true}).waitFor();
  await page.waitForFunction(()=>!document.querySelector('.password-panel'));assert.equal(await page.evaluate(()=>document.cookie.includes('novaobra_refresh')),false);
  assert.ok((await page.context().cookies()).some(c=>c.name==='novaobra_refresh'&&c.httpOnly));
  await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();await page.getByRole('heading',{name:'Iniciar sesión',exact:true}).waitFor();
  await page.getByLabel('Correo',{exact:true}).fill('admin@example.test');await page.getByLabel('Contraseña',{exact:true}).fill(f.password);await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.waitForURL(u=>u.pathname.startsWith('/gestion/'));
  await page.goto(f.config.publicUrl+'/cuenta');await page.getByLabel('Contraseña actual para vincular Google').fill(f.password);identity='admin';await page.getByRole('button',{name:'Vincular mi cuenta de Google',exact:true}).click();
  await page.getByText('Google se vinculó correctamente.',{exact:true}).waitFor();await page.getByRole('heading',{name:'Hola, Admin',exact:true}).waitFor();assert.equal(await page.locator('.password-panel').count(),1);
  await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();await page.getByRole('button',{name:'Continuar con Google',exact:true}).click();await page.waitForURL(u=>u.pathname==='/catalogo');
  await page.goto(f.config.publicUrl+'/admin');await page.getByRole('heading',{name:'Administración',exact:true}).waitFor();
  await page.goto(f.config.publicUrl);await page.getByRole('button',{name:'Cargar 48 productos de ejemplo',exact:true}).click();await page.getByText('48 productos añadidos; 0 existentes conservados.',{exact:true}).waitFor();
  await page.locator('.discovery-count strong').filter({hasText:'55'}).waitFor();
  await page.getByRole('navigation',{name:'Explorar productos por departamento'}).getByRole('button',{name:'Seguridad y protección',exact:true}).click();
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('.discovery-products .product-card small')).every(n=>n.textContent.includes('Seguridad'))&&document.querySelectorAll('.discovery-products .product-card').length>0);
  await page.getByRole('button',{name:'Todo el catálogo',exact:true}).click();await page.locator('.discovery-count strong').filter({hasText:'55'}).waitFor();
  await mkdir(new URL('../artifacts/',import.meta.url),{recursive:true});
  for(const width of [1440,390,320]){await page.setViewportSize({width,height:1000});await page.evaluate(()=>window.scrollTo(0,0));await page.waitForFunction(()=>Array.from(document.images).every(i=>i.complete));assert.equal(await page.locator('.skip-link').isVisible(),false);await page.screenshot({path:new URL('../artifacts/catalogo-publico-'+width+'.png',import.meta.url).pathname,fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  assert.equal((await f.pool.query('SELECT COUNT(*) AS n FROM identidades_google'))[0][0].n,2);assert.deepEqual(errors,[]);
 }finally{if(browser)await browser.close();if(vite&&vite.exitCode===null){const done=once(vite,'exit');vite.kill('SIGTERM');await done;}await f.close();}
});
