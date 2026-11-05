import React,{useState} from 'react';
import {useAuth} from '../context/AuthContext.jsx';
import {api} from '../services/api.js';
import {Icon} from './Visuals.jsx';
export default function DemoCatalogButton({onLoaded}){
 const {user}=useAuth(),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 if(user?.rol!=='administrador')return null;
 async function load(){setBusy(true);setMessage('');setError('');try{const result=await api('/admin/catalogo-demo',{method:'POST',body:{}});setMessage(`${result.added} productos añadidos; ${result.skipped} existentes conservados.`);onLoaded?.();}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <div className="demo-loader"><div><Icon name="box"/><span><strong>Catálogo de ejemplo</strong><small>Añade 48 productos de demostración sin reemplazar tus registros.</small></span></div><button className="secondary" disabled={busy} onClick={load}>{busy?'Cargando productos…':'Cargar 48 productos de ejemplo'}</button>{message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}</div>;
}
