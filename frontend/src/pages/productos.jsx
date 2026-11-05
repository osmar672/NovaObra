import React from 'react';
import Entidad from './Entidad.jsx';
import service from '../services/productos.js';
export default function Page(){return <Entidad name="productos" service={service}/>;}
