import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import http from 'node:http';
import newman from 'newman';
const require=createRequire(import.meta.url);
test('Postman conserva sus 118 variables dinámicas con Faker corregido',()=>{
 const generators=require('postman-collection/lib/superstring/dynamic-variables');
 assert.equal(Object.keys(generators).length,118);
 for(const [name,{generator}] of Object.entries(generators)){
  assert.equal(typeof generator,'function',name);
  const result=generator();assert.notEqual(result,undefined,name);assert.notEqual(result,null,name);
 }
 assert.match(generators.$randomEmail.generator(),/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
 assert.match(generators.$guid.generator(),/^[0-9a-f-]{36}$/i);
});
test('Newman conserva iteraciones CSV, BOM, comillas, Unicode y scripts Postman',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'novaobra-csv-'));
 const file=join(directory,'datos.csv');const seen=[];
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');seen.push(url.searchParams.get('label'));
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({label:url.searchParams.get('label'),quantity:url.searchParams.get('quantity')}));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  await writeFile(file,'\uFEFFlabel,quantity\n"café, azul",2\n"válvula ""especial""",3\n');
  const collection={info:{name:'Compatibilidad CSV',schema:'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'},item:[{name:'CSV real',request:{method:'GET',url:`http://127.0.0.1:${server.address().port}/echo?label={{label}}&quantity={{quantity}}`},event:[{listen:'test',script:{type:'text/javascript',exec:[
   "pm.test('Datos CSV preservados',()=>{pm.expect(pm.response.json().label).to.eql(pm.iterationData.get('label'));pm.expect(pm.response.json().quantity).to.eql(String(pm.iterationData.get('quantity')));});",
   "pm.test('Variable dinámica',()=>pm.expect(pm.variables.replaceIn('{{$randomEmail}}')).to.match(/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/));"
  ]}}]}]};
  const result=await new Promise((resolve,reject)=>newman.run({collection,iterationData:file,reporters:[],timeoutRequest:3000},(error,summary)=>error?reject(error):resolve(summary)));
  assert.deepEqual(result.run.failures.map(f=>f.error.message),[]);assert.equal(result.run.stats.requests.total,2);assert.equal(result.run.stats.assertions.total,4);
  assert.deepEqual(seen,['café, azul','válvula "especial"']);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});}
});
