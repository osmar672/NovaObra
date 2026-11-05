import {configuration} from '../src/config.js';
import {createPool} from '../src/db.js';
import {addDemoCatalog} from '../src/services/demoCatalog.js';
let pool;
try{
 const config=configuration();pool=createPool(config.db);
 const result=await addDemoCatalog(pool,config.database);
 console.log(`Catálogo de demostración: ${result.added} productos añadidos; ${result.skipped} ya existentes conservados. Operador registrado: #${result.operatorId}.`);
 console.log('Precios y existencias son ficticios para pruebas. Los registros anteriores no se sustituyeron.');
}catch(error){console.error('No se pudo ampliar el catálogo:',error.code||error.message);process.exitCode=1;}
finally{if(pool)await pool.end();}
