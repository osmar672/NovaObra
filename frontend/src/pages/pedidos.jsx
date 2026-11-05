import React from 'react';
import Entidad from './Entidad.jsx';
import service from '../services/pedidos.js';
export default function Page(){return <Entidad name="pedidos" service={service}/>;}
