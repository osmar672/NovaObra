import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {api,currentToken,setToken} from '../services/api.js';
const Context=createContext(null);
export function AuthProvider({children}) {
 const navigate=useNavigate(),restore=useRef(null);
 const [token,updateToken]=useState(currentToken),[user,setUser]=useState(null),[authReady,setReady]=useState(false),[authError,setError]=useState('');
 const clear=()=>{restore.current?.abort();setToken('');updateToken('');setUser(null);setReady(true);};
 useEffect(()=>{
  const controller=new AbortController();restore.current=controller;
  const expired=()=>{clear();navigate('/login',{replace:true});};
  const logged=event=>{updateToken(event.detail.token);setUser(event.detail.usuario);setError('');setReady(true);};
  window.addEventListener('novaobra:unauthorized',expired);window.addEventListener('novaobra:authenticated',logged);
  api('/auth/session',{method:'POST',body:{},signal:controller.signal})
   .catch(e=>{if(e.name!=='AbortError'&&!currentToken()){if(e.status!==401)setError(e.message);clear();}})
   .finally(()=>{if(!controller.signal.aborted)setReady(true);});
  return()=>{controller.abort();window.removeEventListener('novaobra:unauthorized',expired);window.removeEventListener('novaobra:authenticated',logged);};
 },[]);
 useEffect(()=>{
  if(!token)return;
  let expiry;
  try{expiry=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).exp*1000;}catch{clear();return;}
  const remaining=expiry-Date.now();if(!Number.isFinite(remaining)||remaining<=0){clear();return;}
  const timer=setTimeout(()=>{clear();navigate('/login',{replace:true});},Math.min(remaining,2147483647));return()=>clearTimeout(timer);
 },[token]);
 const logout=async()=>{restore.current?.abort();try{await api('/auth/logout',{method:'POST',body:{}});}finally{clear();navigate('/login',{replace:true});}};
 const login=async body=>{restore.current?.abort();try{return await api('/auth/login',{method:'POST',body});}finally{setReady(true);}};
 return <Context.Provider value={{token,user,setUser:value=>{if(!value)clear();else setUser(value);},authReady,authError,logout,login,register:body=>api('/auth/register',{method:'POST',body})}}>{children}</Context.Provider>;
}
export const useAuth=()=>useContext(Context);
