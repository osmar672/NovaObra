import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from 'playwright-core';
import jwt from 'jsonwebtoken';
import {fixture,available} from './helpers.js';
test('Día 2 en navegador: rutas protegidas, ocho vistas, CRUD, relaciones y expiración', {skip:!available,timeout:60000},async()=>{
 const f=await fixture();let vite,browser;
 try{
  vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','frontend/vite.config.js'],{cwd:new URL('../',import.meta.url),env:{...process.env,HOST:'127.0.0.1',PORT:new URL(f.base).port},stdio:['ignore','pipe','pipe']});
  let output='';vite.stdout.on('data',x=>output+=x);vite.stderr.on('data',x=>output+=x);
  for(let i=0;i<100;i++){if(vite.exitCode!==null)throw new Error(output);try{if((await fetch(f.config.publicUrl+'/api/health')).ok)break;}catch{}await delay(100);}
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:process.env.CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
  const page=await browser.newPage();page.setDefaultTimeout(7000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(f.config.publicUrl+'/gestion/categorias');await page.getByRole('heading',{name:'Iniciar sesión',exact:true}).waitFor();
  await page.getByLabel('Correo',{exact:true}).fill('admin@example.test');await page.getByLabel('Contraseña',{exact:true}).fill(f.password);await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await page.getByRole('heading',{name:'Gestión de Categorías'}).waitFor();
  await page.getByRole('button',{name:'Crear registro'}).click();await page.getByLabel('nombre',{exact:true}).fill('Categoría navegador Día2');await page.getByLabel('descripcion',{exact:true}).fill('Persistencia real');await page.getByRole('button',{name:'Guardar',exact:true}).click();
  const row=page.getByRole('row').filter({hasText:'Categoría navegador Día2'});await row.waitFor();
  const [[stored]]=await f.pool.query('SELECT id FROM categorias WHERE nombre=?',['Categoría navegador Día2']);assert.ok(stored.id);
  await row.getByRole('button',{name:'Consultar',exact:true}).click();await page.getByRole('heading',{name:'Detalle del registro'}).waitFor();await page.getByRole('button',{name:'Cerrar detalle'}).click();
  await row.getByRole('button',{name:'Editar',exact:true}).click();await page.getByLabel('nombre',{exact:true}).fill('Categoría editada Día2');await page.getByRole('button',{name:'Guardar',exact:true}).click();
  const edited=page.getByRole('row').filter({hasText:'Categoría editada Día2'});await edited.waitFor();
  page.once('dialog',dialog=>dialog.dismiss());await edited.getByRole('button',{name:'Eliminar',exact:true}).click();assert.equal((await f.pool.query('SELECT id FROM categorias WHERE id=?',[stored.id]))[0].length,1);
  page.once('dialog',dialog=>dialog.accept());await edited.getByRole('button',{name:'Eliminar',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('tbody')?.textContent.includes('Categoría editada Día2'));
  assert.equal((await f.pool.query('SELECT id FROM categorias WHERE id=?',[stored.id]))[0].length,0);
  for(const [resource,label]of Object.entries({marcas:'Marcas',productos:'Productos',clientes:'Clientes',inventario:'Inventario',pedidos:'Pedidos',detalle_pedidos:'Detalles de pedidos',movimientos_inventario:'Movimientos de inventario'})){
   await page.goto(f.config.publicUrl+'/gestion/'+resource);await page.getByRole('heading',{name:'Gestión de '+label,exact:true}).waitFor();await page.getByRole('button',{name:'Crear registro'}).waitFor();
  }
  await page.goto(f.config.publicUrl+'/gestion/productos');await page.getByRole('button',{name:'Crear registro'}).click();
  await page.getByLabel('categoria id',{exact:true}).waitFor();
  assert.ok(await page.getByLabel('categoria id',{exact:true}).locator('option').count()>1);assert.ok(await page.getByLabel('marca id',{exact:true}).locator('option').count()>1);
  const [[admin]]=await f.pool.query("SELECT id,version_sesion FROM usuarios WHERE email='admin@example.test'");
  const expiring=jwt.sign({v:admin.version_sesion},f.config.secret,{algorithm:'HS256',subject:String(admin.id),issuer:'NovaObra',audience:'NovaObra-client',expiresIn:3});
  await page.evaluate(token=>sessionStorage.setItem('novaobra-jwt',token),expiring);await page.goto(f.config.publicUrl+'/gestion/categorias');await page.getByRole('heading',{name:'Iniciar sesión',exact:true}).waitFor({timeout:8000});
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('novaobra-jwt')),null);
  await page.getByLabel('Correo',{exact:true}).fill('admin@example.test');await page.getByLabel('Contraseña',{exact:true}).fill(f.password);await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await page.getByRole('heading',{name:'Gestión de Categorías',exact:true}).waitFor();
  await page.goto(f.config.publicUrl+'/cuenta');await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();await page.getByRole('heading',{name:'Iniciar sesión',exact:true}).waitFor();
  assert.deepEqual(errors,[]);
 }finally{if(browser)await browser.close();if(vite&&vite.exitCode===null){const done=once(vite,'exit');vite.kill('SIGTERM');await done;}await f.close();}
});
