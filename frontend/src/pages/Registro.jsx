import React,{useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {useAuth} from '../context/AuthContext.jsx';
import {AuthShell} from '../components/Visuals.jsx';
import {Meta} from '../components/UI.jsx';
export default function Registro(){
 const {register}=useAuth(),navigate=useNavigate();const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function submit(event){event.preventDefault();setBusy(true);setError('');try{await register(Object.fromEntries(new FormData(event.currentTarget)));navigate('/login',{replace:true,state:{registered:true}});}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <AuthShell register><Meta title="Crear cuenta"/>{error&&<p role="alert">{error}</p>}<form className="auth-fields" onSubmit={submit}><label>Nombre<input name="nombre" required maxLength="120" autoComplete="name"/></label><label>Correo<input name="correo" type="email" required maxLength="190" autoComplete="username"/></label><label>Contraseña (mínimo 8 caracteres)<input name="password" type="password" required minLength="8" maxLength="128" autoComplete="new-password"/></label><button disabled={busy}>{busy?'Registrando…':'Registrarme'}</button><Link to="/login">Ya tengo cuenta</Link></form></AuthShell>;
}
