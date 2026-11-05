let token='', generation=0, renewal;
try {sessionStorage.removeItem('novaobra-jwt');}catch{}
export const currentToken=()=>token;
export function setToken(value){token=value||'';generation++;}
const claims=value=>{try{return JSON.parse(atob(value.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));}catch{return {};}};
const sameSession=(a,b)=>a&&b&&claims(a).sub===claims(b).sub&&claims(a).sid===claims(b).sid;
function authenticated(content){setToken(content.token);window.dispatchEvent(new CustomEvent('novaobra:authenticated',{detail:content}));}
function unauthorized(){setToken('');window.dispatchEvent(new Event('novaobra:unauthorized'));}
async function send(path,{method='GET',body,signal}={},value=token){
 const headers={'X-NovaObra-Request':'1'};
 if(value)headers.Authorization=`Bearer ${value}`;
 if(body!==undefined)headers['Content-Type']='application/json';
 let response;
 try{response=await fetch(`${import.meta.env.VITE_API_URL||'/api'}${path}`,{method,credentials:'include',headers,signal,body:body===undefined?undefined:JSON.stringify(body)});}
 catch(e){if(e.name==='AbortError')throw e;throw new Error('No hay conexión con el servidor de la tienda.');}
 if(response.status===204)return null;
 const content=await response.json().catch(()=>({error:'El servidor no respondió con JSON válido.'}));
 if(!response.ok)throw Object.assign(new Error(content.error||'No se pudo completar la solicitud.'),{status:response.status});
 return content;
}
export function renewSession(){
 if(renewal)return renewal;
 const expected=generation,hadToken=Boolean(token);
 const renew=async()=>{
  if(expected!==generation)return null;
  const content=await send('/auth/refresh',{method:'POST',body:{},signal:AbortSignal.timeout(10000)},'');
  if(expected===generation)authenticated(content);
  return content;
 };
 renewal=(navigator.locks?navigator.locks.request('novaobra-refresh',renew):renew())
  .catch(e=>{if(expected===generation&&hadToken&&e.status===401)unauthorized();throw e;}).finally(()=>{renewal=null;});
 return renewal;
}
export async function api(path,options={}){
 if(['/auth/session','/auth/refresh'].includes(path))return renewSession();
 const initialToken=token,initialGeneration=generation;
 let content;
 try{
  const authMutation=['/auth/login','/auth/logout','/auth/registro'].includes(path);
  if(authMutation){if(renewal)await renewal.catch(()=>{});const execute=()=>send(path,options,path==='/auth/logout'?'':token);content=await (navigator.locks?navigator.locks.request('novaobra-refresh',execute):execute());}
  else content=await send(path,options);
 }
 catch(error){
  if(error.status!==401||!initialToken||path.startsWith('/auth/'))throw error;
  if(initialGeneration===generation){try{await renewSession();}catch(e){throw e;}}
  if(!sameSession(initialToken,token))throw error;
  try{return await send(path,options);}catch(e){if(e.status===401&&sameSession(initialToken,token))unauthorized();throw e;}
 }
 if(content?.token&&content.usuario&&initialGeneration===generation)authenticated(content);
 return content;
}
export const money=value=>new Intl.NumberFormat('es-CR',{style:'currency',currency:'CRC',maximumFractionDigits:2}).format(Number(value)||0);
export const slug=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export const productPath=p=>`/producto/${p.id}/${slug(p.nombre)}`;
