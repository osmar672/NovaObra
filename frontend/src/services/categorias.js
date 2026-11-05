import {api} from './api.js';
export default {list:(page=1,signal)=>api('/categorias'+('categorias'==='productos'?'?pagina='+page:''),{signal}),read:id=>api('/categorias/'+id),create:body=>api('/categorias',{method:'POST',body}),update:(id,body)=>api('/categorias/'+id,{method:'PUT',body}),remove:id=>api('/categorias/'+id,{method:'DELETE'})};
