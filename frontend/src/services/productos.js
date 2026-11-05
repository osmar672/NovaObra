import {api} from './api.js';
export default {list:(page=1,signal)=>api('/productos'+('productos'==='productos'?'?pagina='+page:''),{signal}),read:id=>api('/productos/'+id),create:body=>api('/productos',{method:'POST',body}),update:(id,body)=>api('/productos/'+id,{method:'PUT',body}),remove:id=>api('/productos/'+id,{method:'DELETE'})};
