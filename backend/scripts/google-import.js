import {ask} from './prompt.js';
import {saveGoogleConfiguration,readGoogleClientJson} from './google-configuration.js';
try{
 if(process.argv.length>3)throw new Error('Usa npm run google:import o npm run google:import -- "ruta al JSON".');
 console.log('Descarga el JSON del cliente OAuth web activo desde Google Cloud. No lo compartas ni lo subas a Git.');
 const path=process.argv[2]||await ask('Ruta del archivo JSON descargado: ');
 const result=await saveGoogleConfiguration(callback=>readGoogleClientJson(path,callback));
 console.log('ID y secreto importados juntos en backend/.env.');
 console.log('ID público: '+result.id+'\nRedirección: '+result.callback);
 console.log('Ejecuta npm run google:check y reinicia con npm start.');
 console.log('Esto comprueba la configuración local; el intento de acceso confirmará si Google acepta el cliente.');
}catch(error){console.error('No se pudo importar Google:',error.message);process.exitCode=1;}
