import test from 'node:test';
import assert from 'node:assert/strict';
import {googleProviderFailure,googleCallbackDiagnostic} from '../backend/src/services/googleDiagnostics.js';
test('Google: clasifica credenciales, código, disponibilidad, red, TLS y verificación sin exponer errores',()=>{
 for(const [error,stage,reason] of [
  [{response:{data:{error:'invalid_client'}}},'exchange','credentials'],
  [{response:{data:{error:'unauthorized_client'}}},'exchange','credentials'],
  [{response:{data:{error:'redirect_uri_mismatch'}}},'exchange','redirect'],
  [{response:{data:{error:'invalid_grant'}}},'exchange','code_expired'],
  [{response:{status:503}},'exchange','provider_unavailable'],
  [{cause:{code:'ENOTFOUND'}},'exchange','network'],
  [{cause:{code:'UNABLE_TO_VERIFY_LEAF_SIGNATURE'}},'verification','tls'],
  [{message:'Token used too early, private-token-claims'},'verification','clock'],
  [{message:'Invalid token signature: private-token'},'verification','verification'],
 ]){
  error.config={data:'client_secret=private-client-secret'};
  const failure=googleProviderFailure(error,stage),diagnostic=googleCallbackDiagnostic(failure,'exchange');
  assert.equal(diagnostic.reason,reason);assert.equal(diagnostic.line,`[NovaObra Google] etapa=${stage} motivo=${reason}`);
  assert.ok(!JSON.stringify({failure,diagnostic}).includes('private-'));
 }
});
test('Google: diagnóstico de MySQL limitado a etiquetas fijas',()=>{
 assert.deepEqual(googleCallbackDiagnostic({code:'ER_NO_SUCH_TABLE',message:'private SQL'},'identity'),{reason:'database_schema',line:'[NovaObra Google] etapa=identity motivo=database_schema'});
 assert.equal(googleCallbackDiagnostic({message:'private SQL'},'session').reason,'session_error');
 const unexpected=googleCallbackDiagnostic({reason:'private secret',stage:'private token'},'untrusted');
 assert.deepEqual(unexpected,{reason:'provider',line:'[NovaObra Google] etapa=transaction motivo=provider'});
});
