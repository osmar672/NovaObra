import {ask} from './prompt.js';
import {saveGoogleConfiguration} from './google-configuration.js';
try{
 const result=await saveGoogleConfiguration(async callback=>{
  console.log('1. Abre https://console.cloud.google.com/auth/clients');
  console.log('2. Selecciona un cliente OAuth activo de tipo Aplicación web.');
  console.log('3. Registra exactamente esta URI de redirección:\n'+callback);
  console.log('En modo de prueba añade tu cuenta a los usuarios de prueba.');
  console.log('También puedes importar el JSON de Google con npm run google:import.');
  return {id:(await ask('ID de cliente OAuth de Google: ')).trim(),secret:(await ask('Secreto de cliente (oculto): ',{secret:true})).trim()};
 });
 console.log('Configuración guardada en backend/.env. ID público: '+result.id);
 console.log('Reinicia con npm start. No compartas el secreto ni el archivo .env.');
}catch(error){console.error('No se pudo configurar Google:',error.message);process.exitCode=1;}
