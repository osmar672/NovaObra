const key = 'novaobra-jwt';
let token = '';
let generation = 0;
// Retirar el almacenamiento de versiones anteriores. El JWT vive solo en memoria.
try { sessionStorage.removeItem(key); } catch {}
export const currentToken = () => token;
export function setToken(value) {
  token = value || '';
  generation++;
}
export async function api(path, { method = 'GET', body, signal } = {}) {
  let response;
  const requestToken=token, requestGeneration=generation;
  const headers={};
  if(token)headers.Authorization=`Bearer ${token}`;
  if(body!==undefined)Object.assign(headers,{'Content-Type':'application/json','X-NovaObra-Request':'1'});
  try {
    response=await fetch(`${import.meta.env.VITE_API_URL || '/api'}${path}`,{method,credentials:'include',signal,headers,body:body===undefined?undefined:JSON.stringify(body)});
  } catch(error) {
    if(error.name==='AbortError')throw error;
    throw new Error('No hay conexión con el servidor de la tienda. Comprueba que esté iniciado.');
  }
  if(response.status===204)return null;
  const content=await response.json().catch(()=>({error:'El servidor no respondió con JSON válido.'}));
  if(!response.ok) {
    if(response.status===401 && requestToken && requestToken===token && requestGeneration===generation && !['/auth/login','/auth/register','/auth/registro'].includes(path)) {
      setToken('');window.dispatchEvent(new Event('novaobra:unauthorized'));
    }
    throw Object.assign(new Error(content.error || 'No se pudo completar la solicitud.'),{status:response.status});
  }
  if(content.token && content.usuario && (path!=='/auth/session'||requestGeneration===generation)) {
    setToken(content.token);window.dispatchEvent(new CustomEvent('novaobra:authenticated',{detail:content}));
  }
  return content;
}
export const money = value => new Intl.NumberFormat('es-CR',{style:'currency',currency:'CRC',maximumFractionDigits:2}).format(Number(value)||0);
export const slug = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export const productPath = p => `/producto/${p.id}/${slug(p.nombre)}`;
