import React from 'react';
import Entidad from './Entidad.jsx';
import service from '../services/inventario.js';
export default function Page(){return <Entidad name="inventario" service={service}/>;}
