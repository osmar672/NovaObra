import {api} from './api.js';
export default {list:(page=1,signal)=>api('/clientes'+('clientes'==='productos'?'?pagina='+page:''),{signal}),read:id=>api('/clientes/'+id),create:body=>api('/clientes',{method:'POST',body}),update:(id,body)=>api('/clientes/'+id,{method:'PUT',body}),remove:id=>api('/clientes/'+id,{method:'DELETE'})};
