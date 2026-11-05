import {GoogleLoginError} from '../models/googleIdentity.js';
const connectionCodes=new Set(['ENOTFOUND','EAI_AGAIN','ECONNRESET','ECONNREFUSED','ETIMEDOUT','ENETUNREACH','EHOSTUNREACH','UND_ERR_CONNECT_TIMEOUT','ERR_NETWORK']);
const tlsCodes=new Set(['CERT_HAS_EXPIRED','CERT_NOT_YET_VALID','DEPTH_ZERO_SELF_SIGNED_CERT','SELF_SIGNED_CERT_IN_CHAIN','UNABLE_TO_VERIFY_LEAF_SIGNATURE','UNABLE_TO_GET_ISSUER_CERT_LOCALLY']);
export function googleProviderFailure(error,stage){
 let reason=stage==='verification'?'verification':'provider';
 const provider=error?.response?.data?.error;
 if(provider==='invalid_client'||provider==='unauthorized_client')reason='credentials';
 else if(provider==='redirect_uri_mismatch')reason='redirect';
 else if(provider==='invalid_grant')reason='code_expired';
 else if(provider==='access_denied')reason='cancelled';
 else if(error?.response?.status===429||error?.response?.status>=500)reason='provider_unavailable';
 else if(stage==='verification'&&/^Token used too (early|late),/.test(error?.message||''))reason='clock';
 for(let cause=error,n=0;cause&&n<5;cause=cause.cause,n++){
  if(connectionCodes.has(cause.code)||['TimeoutError','AbortError'].includes(cause.name)){reason='network';break;}
  if(tlsCodes.has(cause.code)){reason='tls';break;}
 }
 const failure=new GoogleLoginError(reason);failure.stage=stage;return failure;
}
// Only fixed labels are returned/logged. Google and SQL error messages can contain tokens or credentials.
export function googleCallbackDiagnostic(error,stage){
 const steps=new Set(['transaction','exchange','verification','identity','session']);
 const step=steps.has(error?.stage)?error.stage:steps.has(stage)?stage:'transaction';
 const reasons=new Set(['configuration','state','cancelled','provider','nonce','unverified','inactive','email_exists','different_email','link_expired','link_conflict','credentials','redirect','code_expired','provider_unavailable','clock','network','tls','verification']);
 let reason=error instanceof GoogleLoginError&&reasons.has(error.reason)?error.reason:null;
 if(!reason){
  if(['ER_NO_SUCH_TABLE','ER_BAD_FIELD_ERROR'].includes(error?.code))reason='database_schema';
  else if(['identity','session'].includes(step))reason='session_error';
  else reason='provider';
 }
 return {reason,line:`[NovaObra Google] etapa=${step} motivo=${reason}`};
}
