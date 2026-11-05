import {api} from './api.js';
export default {list:(page=1,signal)=>api('/inventario'+('inventario'==='productos'?'?pagina='+page:''),{signal}),read:id=>api('/inventario/'+id),create:body=>api('/inventario',{method:'POST',body}),update:(id,body)=>api('/inventario/'+id,{method:'PUT',body}),remove:id=>api('/inventario/'+id,{method:'DELETE'})};
