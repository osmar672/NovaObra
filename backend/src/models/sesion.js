import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {AppError,check,transaction} from '../middlewares/validaciones.js';
export const refreshHash=value=>createHash('sha256').update(value).digest('hex');
const userFields='id,nombre,email,rol_id,activo,version_sesion,creado AS fechaCreacion';
async function lockedUser(c,id){
 const [[user]]=await c.execute(`SELECT ${userFields} FROM usuarios WHERE id=? FOR UPDATE`,[id]);
 if(user){const [[role]]=await c.execute('SELECT nombre FROM roles WHERE id=?',[user.rol_id]);user.rol=role?.nombre;}
 return user;
}
async function insert(c,user,family,expires){
 const value=randomBytes(48).toString('base64url');
 await c.execute('INSERT INTO sesiones_refresh (id,usuario_id,familia,token_hash,version_sesion,expira) VALUES (?,?,?,?,?,?)',[randomUUID(),user.id,family,refreshHash(value),user.version_sesion,expires]);
 return {value,user:{...user,sessionFamily:family},expires};
}
export async function startSession(pool,user,config){
 return transaction(pool,async c=>{
  const current=await lockedUser(c,user.id);
  check(current?.activo&&current.version_sesion===user.version_sesion,'No autorizado',401);
  return insert(c,current,randomUUID(),new Date(Date.now()+(config.refreshTokenSeconds||604800)*1000));
 });
}
export async function revokeUserSessions(c,userId){
 await c.execute('UPDATE sesiones_refresh SET revocado=COALESCE(revocado,UTC_TIMESTAMP()) WHERE usuario_id=?',[userId]);
}
export async function rotateSession(pool,value){
 if(typeof value!=='string'||!/^[A-Za-z0-9_-]{64}$/.test(value))throw new AppError(401,'No autorizado');
 const result=await transaction(pool,async c=>{
  const hash=refreshHash(value);
  const [[hint]]=await c.execute('SELECT usuario_id FROM sesiones_refresh WHERE token_hash=?',[hash]);
  if(!hint)return {invalid:true};
  const user=await lockedUser(c,hint.usuario_id);
  const [[row]]=await c.execute('SELECT * FROM sesiones_refresh WHERE token_hash=? FOR UPDATE',[hash]);
  if(!row)return {invalid:true};
  if(row.consumido||row.revocado||!user?.activo||user.version_sesion!==row.version_sesion||new Date(row.expira).getTime()<=Date.now()){
   // Commit the family revocation before returning 401; throwing here would roll it back.
   await c.execute('UPDATE sesiones_refresh SET revocado=COALESCE(revocado,UTC_TIMESTAMP()) WHERE familia=?',[row.familia]);
   return {invalid:true};
  }
  await c.execute('UPDATE sesiones_refresh SET consumido=UTC_TIMESTAMP() WHERE id=?',[row.id]);
  return insert(c,user,row.familia,new Date(row.expira));
 });
 if(result.invalid)throw new AppError(401,'No autorizado');
 return result;
}
export async function logoutSession(pool,{value,user}){
 return transaction(pool,async c=>{
  let target=user;
  if(!target){
   if(typeof value!=='string'||!/^[A-Za-z0-9_-]{64}$/.test(value))return;
   const [[hint]]=await c.execute('SELECT usuario_id FROM sesiones_refresh WHERE token_hash=?',[refreshHash(value)]);
   if(!hint)return;
   target=await lockedUser(c,hint.usuario_id);
   const [[session]]=await c.execute('SELECT * FROM sesiones_refresh WHERE token_hash=? FOR UPDATE',[refreshHash(value)]);
   if(!target||!session||session.revocado||session.consumido||new Date(session.expira).getTime()<=Date.now()||session.version_sesion!==target.version_sesion)return;
  }else target=await lockedUser(c,target.id);
  if(!target)return;
  await c.execute('UPDATE usuarios SET version_sesion=version_sesion+1 WHERE id=?',[target.id]);
  await revokeUserSessions(c,target.id);
 });
}
