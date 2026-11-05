import React from 'react';
import Entidad from './Entidad.jsx';
import service from '../services/clientes.js';
export default function Page(){return <Entidad name="clientes" service={service}/>;}
