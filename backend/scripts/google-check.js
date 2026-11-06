import {readGoogleConfiguration,googleConfigurationReport} from './google-configuration.js';
try{
 const report=googleConfigurationReport(await readGoogleConfiguration());
 console.log(JSON.stringify(report,null,2));
 console.log('Compara el ID público con el del cliente web activo en Google Cloud.');
 if(report.duplicadas.length||report.reemplazadasPorLaTerminal.length){console.log('Hay configuraciones que pueden reemplazar tus credenciales. Corrígelas antes de iniciar.');process.exitCode=1;}
 if(!report.secretoConfigurado){console.log('Falta configurar el secreto del cliente.');process.exitCode=1;}
 console.log('Este diagnóstico no imprime el secreto ni verifica la aceptación de Google.');
}catch(error){console.error('No se pudo comprobar Google:',error.message);process.exitCode=1;}
