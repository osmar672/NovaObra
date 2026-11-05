import {Router} from 'express';
import {check,credential} from '../middlewares/validaciones.js';
import {verifyPassword,refreshCookie,loginLimiter} from '../middlewares/authMiddleware.js';
import {startSession} from '../models/sesion.js';
import {googleStatus,resolveGoogleIdentity,GoogleLoginError} from '../models/googleIdentity.js';
import {googleClient,googleAuthorizationUrl,googleClaims,newOAuthTransaction,sealOAuthTransaction,openOAuthTransaction,oauthCookie,setOAuthCookie,matchingState,safeReturnTo} from '../services/googleOAuth.js';
export function googleRoutes(pool,config,access,adapters={}){
 const router=Router(),enabled=Boolean(config.google?.enabled),client=enabled?googleClient(config,adapters.googleClient):null;
 const secure=config.secureCookies??config.production,attempts=loginLimiter();
 const available=(_req,_res,next)=>{try{check(enabled,'El acceso con Google todavía no está configurado.',503);next();}catch(error){next(error);}};
 router.get('/status',access.requireBearer,async(req,res)=>res.json({enabled,...await googleStatus(pool,req.user.id)}));
 const begin=mode=>async(req,res)=>{
  let binding={mode,returnTo:safeReturnTo(req.body.returnTo)};
  if(mode==='link'){
   const [[user]]=await pool.execute('SELECT password_hash,password_local,version_sesion FROM usuarios WHERE id=?',[req.user.id]);
   check(user?.password_local&&await verifyPassword(credential(req.body.password),user.password_hash),'Confirma tu contraseña actual para vincular Google.',401);
   binding={mode,returnTo:'/cuenta?google=linked',userId:req.user.id,version:user.version_sesion};
  }
  const tx=newOAuthTransaction(binding);setOAuthCookie(res,sealOAuthTransaction(tx,config.secret),secure);
  res.json({url:googleAuthorizationUrl(client,tx)});
 };
 router.post('/start',attempts,access.cookieCsrf,available,begin('login'));
 router.post('/link',attempts,access.cookieCsrf,access.requireBearer,available,begin('link'));
 router.get('/callback',attempts,async(req,res)=>{
  res.set({'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});
  try{
   if(!enabled)throw new GoogleLoginError('configuration');
   const tx=openOAuthTransaction(oauthCookie(req),config.secret);
   if(!matchingState(req.query.state,tx.state))throw new GoogleLoginError('state');
   if(req.query.error)throw new GoogleLoginError(req.query.error==='access_denied'?'cancelled':'provider');
   if(typeof req.query.code!=='string'||!req.query.code||req.query.code.length>4096)throw new GoogleLoginError('provider');
   const claims=await googleClaims(client,config,req.query.code,tx);
   const user=await resolveGoogleIdentity(pool,claims,tx);
   const session=await startSession(pool,user,config);
   refreshCookie(res,session.value,secure,session.expires);
   res.clearCookie('novaobra_session',{httpOnly:true,secure:Boolean(secure),sameSite:'lax',path:'/'});
   setOAuthCookie(res,'',secure,true);
   res.redirect(303,config.publicUrl+'/auth/google/complete?next='+encodeURIComponent(safeReturnTo(tx.returnTo)));
  }catch(error){
   setOAuthCookie(res,'',secure,true);
   const reason=error instanceof GoogleLoginError?error.reason:'provider';
   res.redirect(303,config.publicUrl+'/login?google_error='+encodeURIComponent(reason));
  }
 });
 return router;
}
