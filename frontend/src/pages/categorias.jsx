import React from 'react';
import Entidad from './Entidad.jsx';
import service from '../services/categorias.js';
export default function Page(){return <Entidad name="categorias" service={service}/>;}
