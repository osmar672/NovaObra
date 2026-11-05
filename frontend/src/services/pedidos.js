import {api} from './api.js';
export default {list:(page=1,signal)=>api('/pedidos'+('pedidos'==='productos'?'?pagina='+page:''),{signal}),read:id=>api('/pedidos/'+id),create:body=>api('/pedidos',{method:'POST',body}),update:(id,body)=>api('/pedidos/'+id,{method:'PUT',body}),remove:id=>api('/pedidos/'+id,{method:'DELETE'})};
