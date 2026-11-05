import React from 'react';
import Entidad from './Entidad.jsx';
import service from '../services/marcas.js';
export default function Page(){return <Entidad name="marcas" service={service}/>;}
