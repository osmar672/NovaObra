import React from 'react';
import Entidad from './Entidad.jsx';
import service from '../services/detalle_pedidos.js';
export default function Page(){return <Entidad name="detalle_pedidos" service={service}/>;}
