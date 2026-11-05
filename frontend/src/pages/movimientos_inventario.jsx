import React from 'react';
import Entidad from './Entidad.jsx';
import service from '../services/movimientos_inventario.js';
export default function Page(){return <Entidad name="movimientos_inventario" service={service}/>;}
