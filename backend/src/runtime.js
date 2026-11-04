import { createHash } from 'node:crypto';
export function identity(settings) {
  const {host,port,user,database}=settings;
  return createHash('sha256').update(JSON.stringify({host,port,user,database})).digest('hex');
}
export async function compatibleApi(host,port,expected) {
  try {
    const url=new URL(`http://${host.includes(':')?'['+host+']':host}:${port}/api/health`);
    const response=await fetch(url,{signal:AbortSignal.timeout(2000),redirect:'error'});
    const data=await response.json();
    return response.ok && data.application==='novaobra-control' && data.instance===expected && data.database==='connected';
  }catch{return false;}
}
export async function listen(app,host,port,expected) {
  try {return await new Promise((resolve,reject)=>{const server=app.listen(port,host);server.once('error',reject);server.once('listening',()=>{server.off('error',reject);resolve(server);});});}
  catch(error){
    if(error.code==='EADDRINUSE') {
      if(await compatibleApi(host,port,expected))return null;
      error.message=`El puerto ${port} está ocupado por otro servicio o una versión anterior. Cierra la terminal anterior con Ctrl+C o revisa PORT en backend/.env. En PowerShell: Get-NetTCPConnection -LocalPort ${port} -State Listen`;
    }
    throw error;
  }
}
