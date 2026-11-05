import React from 'react';
import {Navigate,Outlet,useLocation} from 'react-router-dom';
import {useAuth} from '../context/AuthContext.jsx';
import {AccessRestricted} from './Visuals.jsx';
export default function RutaProtegida({children,management=false}) {
 const {token,user,authReady}=useAuth(),location=useLocation();
 if(!authReady)return <p role="status">Comprobando sesión…</p>;
 if(!token||!user)return <Navigate to="/login" replace state={{from:location.pathname+location.search}}/>;
 if(management&&!['administrador','empleado'].includes(user.rol))return <AccessRestricted/>;
 return children||<Outlet/>;
}
