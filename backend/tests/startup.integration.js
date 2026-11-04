import test from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {databaseSettings} from '../src/config/settings.js';
test('Arranque real: crea tablas ausentes y reutiliza un backend iniciado',{timeout:25000},async()=>{
 const config=databaseSettings(),db='NovaObra_test_start_'+randomUUID().replaceAll('-','');
 const admin=await mysql.createConnection({...config,database:undefined});let first;
 function start(port){const child=spawn(process.execPath,['src/server.js'],{cwd:new URL('../',import.meta.url),env:{...process.env,DB_NAME:db,PORT:String(port)},stdio:['ignore','pipe','pipe']});child.output='';for(const stream of[child.stdout,child.stderr])stream.on('data',chunk=>{child.output+=chunk;});return child;}
 try{
  first=start(0);
  const port=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('El backend no anunció disponibilidad')),10000);first.once('exit',()=>{clearTimeout(timeout);reject(Error(first.output));});first.stdout.on('data',()=>{const match=/NovaObra API en .*:(\d+)/.exec(first.output);if(match){clearTimeout(timeout);resolve(Number(match[1]));}});});
  const [[count]]=await admin.execute('SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema=?',[db]);assert.equal(count.n,10);
  const second=start(port);const [code]=await once(second,'exit');assert.equal(code,0,second.output);assert.match(second.output,/ya está ejecutándose/);
  const health=await fetch(`http://127.0.0.1:${port}/api/health`);assert.equal(health.status,200);
 }finally{
  if(first && first.exitCode===null){const done=once(first,'exit');first.kill('SIGTERM');await done;}
  await admin.query('DROP DATABASE IF EXISTS ??',[db]);await admin.end();
 }
});
