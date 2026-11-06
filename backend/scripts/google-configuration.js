import {readFile,writeFile,rename,unlink,open,stat} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import dotenv from 'dotenv';

const defaults={backendEnvPath:fileURLToPath(new URL('../.env',import.meta.url)),rootEnvPath:fileURLToPath(new URL('../../.env',import.meta.url))};
const names=['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET'];
async function optionalFile(path){try{return await readFile(path,'utf8');}catch(error){if(error.code==='ENOENT')return null;throw new Error('No se pudo leer la configuración local.');}}
export async function readGoogleConfiguration(options={}){
 const paths={...defaults,...options},environment=options.environment??process.env;
 const [backend,root]=await Promise.all([optionalFile(paths.backendEnvPath),optionalFile(paths.rootEnvPath)]);
 if(backend===null&&root===null)throw new Error('Primero configura la tienda con npm run db:configure.');
 const files={...dotenv.parse(root||''),...dotenv.parse(backend||'')};
 const effective={...files};
 for(const key of ['PUBLIC_URL',...names])if(environment[key]!==undefined)effective[key]=environment[key];
 let origin;try{origin=new URL(effective.PUBLIC_URL||'http://127.0.0.1:5174');}catch{throw new Error('Revisa PUBLIC_URL: debe ser el origen de tu tienda.');}
 if(!['http:','https:'].includes(origin.protocol)||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw new Error('Revisa PUBLIC_URL: debe ser el origen de tu tienda.');
 return {paths,backend,root,files,effective,environment,callback:origin.origin+'/api/auth/google/callback'};
}
export function validateGoogleCredentials({id,secret}){
 if(typeof id!=='string'||id.length>255||!/^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(id))throw new Error('El ID de cliente debe terminar en .apps.googleusercontent.com.');
 if(typeof secret!=='string'||!/^[A-Za-z0-9._~-]{12,512}$/.test(secret))throw new Error('El secreto del cliente no es válido. Copia su valor completo desde Google Cloud.');
 return {id,secret};
}
export function replaceGoogleCredentials(source,credentials){
 const {id,secret}=validateGoogleCredentials(credentials);
 // Remove every assignment: dotenv uses the last duplicate, including exports/spaces/CRLF.
 const assignment=/^[ \t]*(?:export[ \t]+)?(GOOGLE_CLIENT_ID|GOOGLE_CLIENT_SECRET)[ \t]*=/;
 const lines=source.split(/\r?\n/).filter(line=>{
  const match=assignment.exec(line);if(!match)return true;
  const value=line.slice(match[0].length).trim();
  if(['"',"'",'`'].includes(value[0])&&!value.slice(1).includes(value[0]))throw new Error('La configuración Google contiene un valor multilínea. Corrige esas variables en backend/.env.');
  return false;
 });
 while(lines.at(-1)==='')lines.pop();
 return [...lines,`GOOGLE_CLIENT_ID=${id}`,`GOOGLE_CLIENT_SECRET=${secret}`,''].join(source.includes('\r\n')?'\r\n':'\n');
}
export async function readGoogleClientJson(path,callback){
 let filename=path?.trim();
 if(filename?.length>1&&['"',"'"].includes(filename[0])&&filename.at(-1)===filename[0])filename=filename.slice(1,-1);
 if(!filename)throw new Error('Indica la ruta del JSON descargado desde el cliente web de Google.');
 let contents;
 try{const info=await stat(filename);if(!info.isFile()||info.size>65536)throw new Error();contents=await readFile(filename,'utf8');}
 catch{throw new Error('No se pudo leer el JSON. Comprueba que la ruta corresponda al archivo descargado de Google.');}
 let data;try{data=JSON.parse(contents.replace(/^\uFEFF/,''));}catch{throw new Error('El archivo no contiene un JSON válido. Descárgalo nuevamente desde Google Cloud.');}
 if(!data?.web||typeof data.web!=='object')throw new Error('El JSON debe pertenecer a un cliente OAuth de tipo Aplicación web.');
 const credentials=validateGoogleCredentials({id:data.web.client_id,secret:data.web.client_secret});
 if(!Array.isArray(data.web.redirect_uris)||!data.web.redirect_uris.includes(callback))throw new Error('Añade esta URI de redirección en el cliente web y vuelve a descargar el JSON: '+callback);
 return credentials;
}
export async function saveGoogleConfiguration(getCredentials,options={}){
 const paths={...defaults,...options},lockPath=join(dirname(paths.backendEnvPath),'.env.configure.lock');
 const tempPath=join(dirname(paths.backendEnvPath),'.env.google-'+randomBytes(8).toString('hex')+'.tmp');
 let lock;
 try{
  try{lock=await open(lockPath,'wx',0o600);}catch(error){throw new Error(error.code==='EEXIST'?'Otro asistente de configuración está abierto.':'No se pudo abrir la configuración de Google.');}
  const config=await readGoogleConfiguration(options),credentials=validateGoogleCredentials(await getCredentials(config.callback));
  const next={GOOGLE_CLIENT_ID:credentials.id,GOOGLE_CLIENT_SECRET:credentials.secret};
  if(names.some(key=>config.environment[key]!==undefined&&config.environment[key].trim()!==next[key]))throw new Error('La terminal tiene variables GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET distintas. Elimínalas de su configuración o abre una terminal sin ellas y repite la importación. No se cambió el archivo.');
  const source=replaceGoogleCredentials(config.backend??config.root,credentials);
  await writeFile(tempPath,source,{mode:0o600,flag:'wx'});await rename(tempPath,paths.backendEnvPath);
  return {id:credentials.id,callback:config.callback};
 }finally{await unlink(tempPath).catch(()=>{});if(lock){await lock.close();await unlink(lockPath).catch(()=>{});}}
}
export function googleConfigurationReport(config){
 const duplicates=[];
 for(const [filename,source]of [['backend/.env',config.backend],['.env',config.root]])for(const key of names){
  const expression=new RegExp('^[ \\t]*(?:export[ \\t]+)?'+key+'[ \\t]*=','gm');
  if((source?.match(expression)||[]).length>1)duplicates.push(filename+': '+key);
 }
 return {
  ID:/^[A-Za-z0-9_-]{1,220}\.apps\.googleusercontent\.com$/.test(config.effective.GOOGLE_CLIENT_ID?.trim()||'')?config.effective.GOOGLE_CLIENT_ID.trim():'(sin configurar o formato inválido)',
  redireccion:config.callback,
  secretoConfigurado:Boolean(config.effective.GOOGLE_CLIENT_SECRET?.trim()),
  duplicadas:duplicates,
  reemplazadasPorLaTerminal:names.filter(key=>config.environment[key]!==undefined&&config.files[key]!==undefined&&config.environment[key].trim()!==config.files[key].trim()),
 };
}
