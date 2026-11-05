import {api} from './api.js';
export default {list:(page=1,signal)=>api('/marcas'+('marcas'==='productos'?'?pagina='+page:''),{signal}),read:id=>api('/marcas/'+id),create:body=>api('/marcas',{method:'POST',body}),update:(id,body)=>api('/marcas/'+id,{method:'PUT',body}),remove:id=>api('/marcas/'+id,{method:'DELETE'})};
