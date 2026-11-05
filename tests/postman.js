import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import newman from 'newman';
import jwt from 'jsonwebtoken';
import {fixture,available} from './helpers.js';
test('Colección Postman ejecutada con Newman contra MySQL real', {skip:!available,timeout:60000},async()=>{
 const f=await fixture();
 try{
  const collection=JSON.parse(await readFile(new URL('../postman/Dia2.postman_collection.json',import.meta.url),'utf8'));
  const expired=jwt.sign({sub:'1',v:0},f.config.secret,{algorithm:'HS256',expiresIn:-1,issuer:'NovaObra',audience:'NovaObra-client'});
  const values={base_url:f.base+'/api',manager_email:'admin@example.test',manager_password:f.password,expired_token:expired};
  const result=await new Promise((resolve,reject)=>newman.run({collection,environment:{values:Object.entries(values).map(([key,value])=>({key,value,enabled:true}))},reporters:[],timeoutRequest:5000},(error,summary)=>error?reject(error):resolve(summary)));
  assert.deepEqual(result.run.failures.map(f=>({source:f.source.name,error:f.error.message})),[]);
  console.log(`Newman: ${result.run.stats.requests.total} solicitudes y ${result.run.stats.assertions.total} aserciones aprobadas.`);
 }finally{await f.close();}
});
