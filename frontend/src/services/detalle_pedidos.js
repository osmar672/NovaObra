import {api} from './api.js';
export default {list:(page=1,signal)=>api('/detalle_pedidos'+('detalle_pedidos'==='productos'?'?pagina='+page:''),{signal}),read:id=>api('/detalle_pedidos/'+id),create:body=>api('/detalle_pedidos',{method:'POST',body}),update:(id,body)=>api('/detalle_pedidos/'+id,{method:'PUT',body}),remove:id=>api('/detalle_pedidos/'+id,{method:'DELETE'})};
