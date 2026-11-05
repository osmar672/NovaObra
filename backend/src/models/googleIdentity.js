import {randomBytes} from 'node:crypto';
import {hashPassword} from '../middlewares/authMiddleware.js';
import {AppError,email,transaction} from '../middlewares/validaciones.js';
export class GoogleLoginError extends AppError{
 constructor(reason){super(401,'No se pudo completar el acceso con Google.');this.reason=reason;}
}
export async function googleStatus(pool,userId){
 const [[row]]=await pool.execute('SELECT u.password_local,g.google_sub FROM usuarios u LEFT JOIN identidades_google g ON g.usuario_id=u.id WHERE u.id=?',[userId]);
 return {linked:Boolean(row?.google_sub),localPassword:Boolean(row?.password_local)};
}
export async function resolveGoogleIdentity(pool,claims,binding){
 if(typeof claims.sub!=='string'||!/^[A-Za-z0-9._-]{1,255}$/.test(claims.sub)||claims.email_verified!==true)throw new GoogleLoginError('unverified');
 let mail;try{mail=email(claims.email);}catch{throw new GoogleLoginError('unverified');}
 const name=Array.from(typeof claims.name==='string'?claims.name.trim():mail.split('@')[0]).slice(0,60).join('')||'Cliente';
 const unusedPassword=await hashPassword(randomBytes(48).toString('base64url'));
 async function resolve(){return transaction(pool,async c=>{
  const [[identity]]=await c.execute('SELECT usuario_id FROM identidades_google WHERE google_sub=? FOR UPDATE',[claims.sub]);
  const getUser=async id=>{const [[user]]=await c.execute('SELECT u.*,u.creado AS fechaCreacion,r.nombre AS rol FROM usuarios u JOIN roles r ON r.id=u.rol_id WHERE u.id=? FOR UPDATE',[id]);if(!user?.activo)throw new GoogleLoginError('inactive');return user;};
  if(binding.mode==='link'){
   const user=await getUser(binding.userId);
   if(user.version_sesion!==binding.version)throw new GoogleLoginError('link_expired');
   if(user.email!==mail)throw new GoogleLoginError('different_email');
   if(identity&&identity.usuario_id!==user.id)throw new GoogleLoginError('link_conflict');
   const [[connected]]=await c.execute('SELECT google_sub FROM identidades_google WHERE usuario_id=?',[user.id]);
   if(connected&&connected.google_sub!==claims.sub)throw new GoogleLoginError('link_conflict');
   if(!connected)await c.execute('INSERT INTO identidades_google (google_sub,usuario_id) VALUES (?,?)',[claims.sub,user.id]);
   return user;
  }
  if(identity)return getUser(identity.usuario_id);
  const [[existing]]=await c.execute('SELECT id FROM usuarios WHERE email=? FOR UPDATE',[mail]);
  // Linking requires a signed-in session, the current password and matching verified Google email.
  if(existing)throw new GoogleLoginError('email_exists');
  const [created]=await c.execute('INSERT INTO usuarios (rol_id,nombre,email,password_hash,password_local) VALUES (3,?,?,?,0)',[name,mail,unusedPassword]);
  await c.execute('INSERT INTO clientes (usuario_id) VALUES (?)',[created.insertId]);
  await c.execute('INSERT INTO identidades_google (google_sub,usuario_id) VALUES (?,?)',[claims.sub,created.insertId]);
  return getUser(created.insertId);
 });}
 try{return await resolve();}catch(error){if(['ER_DUP_ENTRY','ER_LOCK_DEADLOCK'].includes(error.code))return resolve();throw error;}
}
