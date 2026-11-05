import {mkdir,readFile,writeFile,access,chmod} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const dir=root+'backend/.certs',cert=dir+'/localhost.crt',key=dir+'/localhost.key';
await mkdir(dir,{recursive:true,mode:0o700});
let exists=false;try{await access(key);exists=true;}catch{}
if(!exists){
 const result=spawnSync('openssl',['req','-x509','-newkey','rsa:3072','-sha256','-nodes','-days','365','-keyout',key,'-out',cert,'-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1,IP:::1'],{encoding:'utf8'});
 if(result.error||result.status!==0)throw new Error('Instala OpenSSL y vuelve a ejecutar npm run https:setup.');
 await chmod(key,0o600);
}
await access(cert);
const env=root+'backend/.env';
let source;try{source=await readFile(env,'utf8');}catch{throw new Error('Primero ejecuta npm run db:configure.');}
for(const [name,value]of Object.entries({TLS_CERT_PATH:'backend/.certs/localhost.crt',TLS_KEY_PATH:'backend/.certs/localhost.key',PUBLIC_URL:'https://127.0.0.1:3443',PORT:'3443',HTTP_REDIRECT_PORT:'3080',NODE_ENV:'development',TRUST_PROXY:''})){
 const line=new RegExp('^'+name+'=.*$','m');source=line.test(source)?source.replace(line,name+'='+value):source+'\n'+name+'='+value;
}
await writeFile(env,source+'\n',{mode:0o600});
console.log('HTTPS local configurado: npm start → https://127.0.0.1:3443. Certificado autofirmado: el navegador pedirá confiar en él solo para desarrollo.');
