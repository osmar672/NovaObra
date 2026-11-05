import {readFile,writeFile,rename,unlink,open} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import dotenv from 'dotenv';
import {ask} from './prompt.js';
const envPath=new URL('../.env',import.meta.url),lockPath=new URL('../.env.configure.lock',import.meta.url),tempPath=new URL(`../.env.google-${randomBytes(8).toString('hex')}.tmp`,import.meta.url);
let lock,done=false;
try{
 lock=await open(lockPath,'wx',0o600);
 let source=await readFile(envPath,'utf8').catch(async error=>{if(error.code!=='ENOENT')throw error;return readFile(new URL('../../.env',import.meta.url),'utf8');});
 const values=dotenv.parse(source),origin=new URL(values.PUBLIC_URL||'http://127.0.0.1:5174');
 if(!['http:','https:'].includes(origin.protocol)||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw new Error('Revisa PUBLIC_URL: debe ser el origen de tu tienda.');
 const callback=origin.origin+'/api/auth/google/callback';
 console.log('1. Abre https://console.cloud.google.com/auth/clients');
 console.log('2. Configura la aplicación y crea un cliente OAuth de tipo Aplicación web.');
 console.log('3. Registra exactamente este URI de redirección autorizado:\n'+callback);
 console.log('En modo de prueba añade tu cuenta de Google a los usuarios de prueba.');
 const id=(await ask('ID de cliente OAuth de Google: ')).trim();
 if(!/^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(id))throw new Error('El ID debe terminar en .apps.googleusercontent.com.');
 const secret=(await ask('Secreto de cliente (oculto): ',{secret:true})).trim();
 if(!/^[A-Za-z0-9._~-]{12,512}$/.test(secret))throw new Error('Secreto de cliente no válido. Cópialo desde Google Cloud.');
 for(const [name,value]of Object.entries({GOOGLE_CLIENT_ID:id,GOOGLE_CLIENT_SECRET:secret})){
  const line=new RegExp('^'+name+'=.*$','m');source=line.test(source)?source.replace(line,name+'='+value):source+'\n'+name+'='+value;
 }
 await writeFile(tempPath,source+'\n',{mode:0o600});await rename(tempPath,envPath);done=true;
 console.log('Configuración guardada en backend/.env. Reinicia con npm start. No compartas ese archivo.');
}catch(error){console.error('No se pudo configurar Google:',error.code==='EEXIST'?'Otro asistente de configuración está abierto.':error.code==='ENOENT'?'Primero configura la tienda con npm run db:configure.':error.message);process.exitCode=1;}
finally{if(!done)await unlink(tempPath).catch(()=>{});if(lock){await lock.close();await unlink(lockPath).catch(()=>{});}}
