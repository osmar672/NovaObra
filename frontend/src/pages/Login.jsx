import React,{useState} from 'react';
import {Link,useLocation,useNavigate} from 'react-router-dom';
import {useAuth} from '../context/AuthContext.jsx';
import {AuthShell} from '../components/Visuals.jsx';
import {Meta} from '../components/UI.jsx';
import GoogleSignIn,{googleErrors} from '../components/GoogleSignIn.jsx';
export default function Login(){
 const {login}=useAuth(),navigate=useNavigate(),location=useLocation();
 const googleError=new URLSearchParams(location.search).get('google_error');
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function submit(event){event.preventDefault();setBusy(true);setError('');try{const response=await login(Object.fromEntries(new FormData(event.currentTarget)));const from=location.state?.from;navigate(from?.startsWith('/')&&!from.startsWith('//')?from:response.usuario.rol==='cliente'?'/catalogo':'/gestion/categorias',{replace:true});}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <AuthShell><Meta title="Iniciar sesión"/>{location.state?.registered&&<p role="status">Cuenta creada. Inicia sesión.</p>}{(error||googleError)&&<p role="alert">{error||googleErrors[googleError]||googleErrors.provider}</p>}<GoogleSignIn/><form className="auth-fields" onSubmit={submit}><label>Correo<input placeholder="tu@correo.com" name="correo" type="email" autoComplete="username" required maxLength="190"/></label><label>Contraseña<input placeholder="Tu contraseña" name="password" type="password" autoComplete="current-password" required maxLength="128"/></label><button disabled={busy}>{busy?'Entrando…':'Entrar'}</button><p className="auth-switch">¿Tu primer proyecto con nosotros? <Link to="/registro">Crear una cuenta →</Link></p></form></AuthShell>;
}
