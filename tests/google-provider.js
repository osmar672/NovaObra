import assert from 'node:assert/strict';
import {generateKeyPairSync,createHash} from 'node:crypto';
import jwt from 'jsonwebtoken';
import {OAuth2Client} from 'google-auth-library';
import {fixture,available} from './helpers.js';
import {openOAuthTransaction,sealOAuthTransaction} from '../backend/src/services/googleOAuth.js';
import {setup} from '../backend/src/schema.js';
const clientId='123456789-fixture.apps.googleusercontent.com';
const keys=generateKeyPairSync('rsa',{modulusLength:2048});
const publicKey=keys.publicKey.export({type:'spki',format:'pem'});
export async function oauthFixture(){
 const google={enabled:true,clientId,clientSecret:'test-only-not-a-real-google-secret',redirectUri:'http://127.0.0.1:5174/api/auth/google/callback'};
 const client=new OAuth2Client({clientId,clientSecret:google.clientSecret,redirectUri:google.redirectUri});
 const codes=new Map();let calls=0;
 client.getToken=async options=>{calls++;const entry=codes.get(options.code);assert.ok(entry,'Código inexistente o reutilizado');codes.delete(options.code);assert.equal(createHash('sha256').update(options.codeVerifier).digest('base64url'),entry.challenge);assert.equal(options.redirect_uri,google.redirectUri);return {tokens:{id_token:entry.token}};};
 // Only transport is mocked. The official library still verifies the RSA signature, expiry, issuer and audience.
 client.getFederatedSignonCertsAsync=async()=>({certs:{'fixture-key':publicKey}});
 const f=await fixture({overrides:{google},adapters:{googleClient:client}});
 async function begin({token,password,returnTo,origin=f.config.publicUrl,header=true}={}){
  return f.request('/api/auth/google/'+(token?'link':'start'),{method:'POST',token,body:{password,returnTo},origin,header});
 }
 function code(start,changes={},name='code-'+codes.size+'-'+Date.now()+Math.random()){
  const params=new URL(start.body.url).searchParams;
  const claims={sub:'google-subject-001',email:'google@example.test',email_verified:true,name:'Cliente Google',nonce:params.get('nonce'),iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,iss:'https://accounts.google.com',aud:clientId,...changes};
  codes.set(name,{challenge:params.get('code_challenge'),token:jwt.sign(claims,keys.privateKey,{algorithm:'RS256',keyid:'fixture-key'})});
  return name;
 }
 async function callback(start,{code:authCode,state,cookie,error}={}){
  const params=new URL(start.body.url).searchParams,query=new URLSearchParams({state:state??params.get('state')});
  if(authCode)query.set('code',authCode);if(error)query.set('error',error);
  const response=await fetch(f.base+'/api/auth/google/callback?'+query,{redirect:'manual',headers:{Cookie:cookie??start.cookie}});await response.text();
  return {status:response.status,location:response.headers.get('location'),cookies:response.headers.getSetCookie(),cookie:response.headers.getSetCookie().find(c=>c.startsWith('novaobra_refresh='))?.split(';')[0]};
 }
 async function restore(cookie){const r=await fetch(f.base+'/api/auth/refresh',{method:'POST',headers:{'Content-Type':'application/json',Origin:f.config.publicUrl,'X-NovaObra-Request':'1',Cookie:cookie||''},body:'{}'});return{status:r.status,body:await r.json()};}
 return {...f,providerClient:client,begin,code,callback,restore,calls:()=>calls,codes};
}
