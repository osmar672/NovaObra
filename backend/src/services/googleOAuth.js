import {googleProviderFailure} from './googleDiagnostics.js';
import {OAuth2Client,CodeChallengeMethod} from 'google-auth-library';
import {randomBytes,createHash,createCipheriv,createDecipheriv,timingSafeEqual} from 'node:crypto';
import {GoogleLoginError} from '../models/googleIdentity.js';
const cookieName='novaobra_google_oauth',lifetime=600000;
const key=secret=>createHash('sha256').update('NovaObra Google OAuth transaction\0'+secret).digest();
export function safeReturnTo(value){return typeof value==='string'&&value.length<=500&&value.startsWith('/')&&!value.startsWith('//')&&!/[\\\r\n]/.test(value)?value:'/catalogo';}
export function sealOAuthTransaction(tx,secret){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(secret),iv);const data=Buffer.concat([cipher.update(JSON.stringify(tx),'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64url');}
export function openOAuthTransaction(value,secret,now=Date.now()){
 try{if(typeof value!=='string'||value.length>3500)throw new Error();const raw=Buffer.from(value,'base64url');if(raw.length<29)throw new Error();const decipher=createDecipheriv('aes-256-gcm',key(secret),raw.subarray(0,12));decipher.setAuthTag(raw.subarray(12,28));const tx=JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)),decipher.final()]).toString('utf8'));if(!Number.isFinite(tx.expires)||tx.expires<=now||tx.expires>now+lifetime+1000)throw new Error();return tx;}catch{throw new GoogleLoginError('state');}
}
export function oauthCookie(req){const raw=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='));return raw?.slice(cookieName.length+1)||'';}
export function setOAuthCookie(res,value,secure,clear=false){const options={httpOnly:true,sameSite:'lax',secure:Boolean(secure),path:'/api/auth/google'};if(clear)res.clearCookie(cookieName,options);else res.cookie(cookieName,value,{...options,maxAge:lifetime});}
export function newOAuthTransaction({mode='login',returnTo,userId,version}={}){return {state:randomBytes(32).toString('base64url'),nonce:randomBytes(32).toString('base64url'),codeVerifier:randomBytes(32).toString('base64url'),expires:Date.now()+lifetime,mode,returnTo:safeReturnTo(returnTo),...(mode==='link'?{userId,version}:{})};}
export function matchingState(actual,expected){return typeof actual==='string'&&typeof expected==='string'&&Buffer.byteLength(actual)===Buffer.byteLength(expected)&&timingSafeEqual(Buffer.from(actual),Buffer.from(expected));}
export function googleClient(config,injected){return injected||new OAuth2Client({clientId:config.google.clientId,clientSecret:config.google.clientSecret,redirectUri:config.google.redirectUri,transporterOptions:{timeout:10000}});}
export function googleAuthorizationUrl(client,tx){return client.generateAuthUrl({scope:['openid','email','profile'],access_type:'online',prompt:'select_account',state:tx.state,nonce:tx.nonce,code_challenge:createHash('sha256').update(tx.codeVerifier).digest('base64url'),code_challenge_method:CodeChallengeMethod.S256});}
export async function googleClaims(client,config,code,tx){
 let tokens;
 try{({tokens}=await client.getToken({code,codeVerifier:tx.codeVerifier,redirect_uri:config.google.redirectUri}));}
 catch(error){throw googleProviderFailure(error,'exchange');}
 if(!tokens.id_token)throw new GoogleLoginError('provider');
 let ticket;
 try{ticket=await client.verifyIdToken({idToken:tokens.id_token,audience:config.google.clientId});}
 catch(error){throw googleProviderFailure(error,'verification');}
 const claims=ticket.getPayload();
 if(!claims||!matchingState(claims.nonce,tx.nonce))throw new GoogleLoginError('nonce');
 return claims;
}
