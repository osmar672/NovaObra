import React,{useState} from 'react';
import {Link,useLocation,useNavigate} from 'react-router-dom';
import {useAuth} from '../context/AuthContext.jsx';
export default function Login(){
 const {login}=useAuth(),navigate=useNavigate(),location=useLocation();
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function submit(event){event.preventDefault();setBusy(true);setError('');try{const response=await login(Object.fromEntries(new FormData(event.currentTarget)));const from=location.state?.from;navigate(from?.startsWith('/')&&!from.startsWith('//')?from:response.usuario.rol==='cliente'?'/catalogo':'/gestion/categorias',{replace:true});}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <div className="container section"><h1>Iniciar sesión</h1>{location.state?.registered&&<p role="status">Cuenta creada. Inicia sesión.</p>}{error&&<p role="alert">{error}</p>}<form className="panel" onSubmit={submit}><label>Correo<input name="correo" type="email" autoComplete="username" required maxLength="190"/></label><label>Contraseña<input name="password" type="password" autoComplete="current-password" required maxLength="128"/></label><button disabled={busy}>{busy?'Entrando…':'Entrar'}</button><p><Link to="/registro">Crear una cuenta</Link></p></form></div>;
}
