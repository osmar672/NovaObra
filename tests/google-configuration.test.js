import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir,rm,stat,copyFile,symlink} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import dotenv from 'dotenv';
import {replaceGoogleCredentials,readGoogleClientJson,saveGoogleConfiguration,readGoogleConfiguration,googleConfigurationReport} from '../backend/scripts/google-configuration.js';
const credentials={id:'123-test.apps.googleusercontent.com',secret:'GOCSPX-test-only-private-secret'};
const callback='http://127.0.0.1:5174/api/auth/google/callback';
async function files(t){
 const dir=await mkdtemp(join(tmpdir(),'nova-google-config-'));t.after(()=>rm(dir,{recursive:true,force:true}));await mkdir(join(dir,'backend'));
 const options={backendEnvPath:join(dir,'backend','.env'),rootEnvPath:join(dir,'.env'),environment:{}};
 await writeFile(options.backendEnvPath,'DB_NAME=Conservar\nJWT_SECRET=conservar-clave-local\nPUBLIC_URL=http://127.0.0.1:5174\n');
 const json=join(dir,'client_secret descargado.json');await writeFile(json,JSON.stringify({web:{client_id:credentials.id,client_secret:credentials.secret,redirect_uris:[callback]}}));
 return {dir,options,json};
}
test('Google: sustituye todos los duplicados sin cambiar MySQL ni JWT',()=>{
 const source='DB_PASSWORD="conservar # contraseña"\r\nJWT_SECRET=conservar\r\nGOOGLE_CLIENT_ID=old.apps.googleusercontent.com\r\n export GOOGLE_CLIENT_SECRET = "old-secret-value"\r\n GOOGLE_CLIENT_ID = stale.apps.googleusercontent.com\r\nGOOGLE_CLIENT_SECRET=stale-secret-value\r\n';
 const updated=replaceGoogleCredentials(source,credentials),values=dotenv.parse(updated);
 assert.equal(values.GOOGLE_CLIENT_ID,credentials.id);assert.equal(values.GOOGLE_CLIENT_SECRET,credentials.secret);
 assert.equal(values.DB_PASSWORD,'conservar # contraseña');assert.equal(values.JWT_SECRET,'conservar');
 assert.equal(updated.match(/^GOOGLE_CLIENT_ID=/gm).length,1);assert.equal(updated.match(/^GOOGLE_CLIENT_SECRET=/gm).length,1);
 assert.ok(!updated.includes('stale'));assert.equal(replaceGoogleCredentials(updated,credentials),updated);
});
test('Google: importa JSON web con ruta entre comillas y guarda únicamente la pareja de credenciales',async t=>{
 const f=await files(t),before=dotenv.parse(await readFile(f.options.backendEnvPath,'utf8'));
 const result=await saveGoogleConfiguration(uri=>readGoogleClientJson('"'+f.json+'"',uri),f.options);
 assert.deepEqual(result,{id:credentials.id,callback});assert.ok(!JSON.stringify(result).includes(credentials.secret));
 const after=dotenv.parse(await readFile(f.options.backendEnvPath,'utf8'));assert.deepEqual(after,{...before,GOOGLE_CLIENT_ID:credentials.id,GOOGLE_CLIENT_SECRET:credentials.secret});
 if(process.platform!=='win32')assert.equal((await stat(f.options.backendEnvPath)).mode&0o777,0o600);
 assert.deepEqual(await readdir(join(f.dir,'backend')),['.env']);
 const report=googleConfigurationReport(await readGoogleConfiguration(f.options));assert.deepEqual(report,{ID:credentials.id,redireccion:callback,secretoConfigurado:true,duplicadas:[],reemplazadasPorLaTerminal:[]});assert.ok(!JSON.stringify(report).includes(credentials.secret));
});
test('Google: JSON erróneo, cliente de escritorio, secreto ausente y URI incorrecta no cambian .env',async t=>{
 const f=await files(t),before=await readFile(f.options.backendEnvPath,'utf8');
 for(const data of ['malformed-private-secret',{installed:{client_id:credentials.id,client_secret:credentials.secret}},{web:{client_id:credentials.id,redirect_uris:[callback]}},{web:{client_id:credentials.id,client_secret:credentials.secret,redirect_uris:['http://localhost:5174/api/auth/google/callback']}}]){
  await writeFile(f.json,typeof data==='string'?data:JSON.stringify(data));
  await assert.rejects(saveGoogleConfiguration(uri=>readGoogleClientJson(f.json,uri),f.options),error=>!error.message.includes(credentials.secret)&&!error.message.includes('malformed-private-secret'));
  assert.equal(await readFile(f.options.backendEnvPath,'utf8'),before);assert.deepEqual(await readdir(join(f.dir,'backend')),['.env']);
 }
});
test('Google: detecta prioridad de terminal, duplicados y configuración en la raíz',async t=>{
 const f=await files(t);
 await writeFile(f.options.rootEnvPath,'PUBLIC_URL=https://example.test\nGOOGLE_CLIENT_ID=root.apps.googleusercontent.com\n');
 await writeFile(f.options.backendEnvPath,'PUBLIC_URL=http://127.0.0.1:5174\nGOOGLE_CLIENT_ID=old.apps.googleusercontent.com\nGOOGLE_CLIENT_ID=last.apps.googleusercontent.com\nGOOGLE_CLIENT_SECRET=old-private-secret\n');
 const options={...f.options,environment:{GOOGLE_CLIENT_ID:'shell.apps.googleusercontent.com',GOOGLE_CLIENT_SECRET:'shell-private-secret'}};
 const report=googleConfigurationReport(await readGoogleConfiguration(options));
 assert.equal(report.ID,options.environment.GOOGLE_CLIENT_ID);assert.equal(report.redireccion,callback);assert.deepEqual(report.duplicadas,['backend/.env: GOOGLE_CLIENT_ID']);assert.deepEqual(report.reemplazadasPorLaTerminal,['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET']);assert.ok(!JSON.stringify(report).includes('private-secret'));
 const before=await readFile(f.options.backendEnvPath,'utf8');await assert.rejects(saveGoogleConfiguration(()=>credentials,options),/terminal/);assert.equal(await readFile(f.options.backendEnvPath,'utf8'),before);
 await rm(f.options.backendEnvPath);const result=await saveGoogleConfiguration(()=>credentials,f.options);assert.equal(result.callback,'https://example.test/api/auth/google/callback');assert.ok((await readFile(f.options.rootEnvPath,'utf8')).includes('root.apps.googleusercontent.com'));
});

test('Google: comandos de importación y diagnóstico funcionan sin imprimir el secreto',{skip:process.platform==='win32'},async t=>{
 const f=await files(t),scripts=join(f.dir,'backend','scripts');await mkdir(scripts);
 for(const filename of ['google-import.js','google-check.js','google-configuration.js','prompt.js'])await copyFile(new URL('../backend/scripts/'+filename,import.meta.url),join(scripts,filename));
 await writeFile(join(f.dir,'package.json'),'{"type":"module"}');await symlink(fileURLToPath(new URL('../node_modules',import.meta.url)),join(f.dir,'node_modules'));
 const env={...process.env};for(const key of ['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','PUBLIC_URL'])delete env[key];
 const run=promisify(execFile),options={cwd:f.dir,env};
 const imported=await run(process.execPath,[join(scripts,'google-import.js'),'"'+f.json+'"'],options);
 assert.ok(imported.stdout.includes(credentials.id));assert.ok(!JSON.stringify(imported).includes(credentials.secret));assert.equal(imported.stderr,'');
 const checked=await run(process.execPath,[join(scripts,'google-check.js')],options);
 assert.ok(checked.stdout.includes('"secretoConfigurado": true'));assert.ok(!JSON.stringify(checked).includes(credentials.secret));
 await assert.rejects(run(process.execPath,[join(scripts,'google-check.js')],{...options,env:{...env,GOOGLE_CLIENT_SECRET:'other-private-secret'}}),error=>error.code===1&&error.stdout.includes('GOOGLE_CLIENT_SECRET')&&!JSON.stringify(error).includes(credentials.secret)&&!error.stdout.includes('other-private-secret'));
});
