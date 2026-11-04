import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {identity,listen} from '../src/runtime.js';
test('Puerto ocupado: reutiliza solo la misma API y rechaza servicios ajenos',async()=>{
  const expected=identity({host:'127.0.0.1',port:3306,user:'test',database:'example'});
  const app=express();let payload={application:'novaobra-control',instance:expected,database:'connected'};
  app.get('/api/health',(_req,res)=>res.json(payload));
  const original=await listen(app,'127.0.0.1',0,expected);
  try{
    assert.equal(await listen(app,'127.0.0.1',original.address().port,expected),null);
    payload={...payload,instance:'otra-base'};
    await assert.rejects(listen(app,'127.0.0.1',original.address().port,expected),error=>error.code==='EADDRINUSE' && error.message.includes('Ctrl+C'));
    assert.equal((await fetch(`http://127.0.0.1:${original.address().port}/api/health`)).status,200);
  }finally{original.closeAllConnections();await new Promise(resolve=>original.close(resolve));}
});
