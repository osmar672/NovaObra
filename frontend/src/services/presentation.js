// Presentación únicamente: no modifica los productos ni sus datos almacenados.
export function productVisual(product={}){
 const value=`${product.nombre||''} ${product.categoria||''}`.toLowerCase();
 if(/pint|brocha|rodillo|color/.test(value))return 'paint';
 if(/tubo|plomer|agua|grifo|pvc/.test(value))return 'plumbing';
 if(/eléctr|electr|cable|enchufe|bombill/.test(value))return 'electric';
 if(/cemento|bloque|arena|material|ladrillo|construcción/.test(value))return 'materials';
 if(/casco|seguridad|guante|protección/.test(value))return 'safety';
 return 'tools';
}
export function productDescription(product={}){
 if(product.descripcion?.trim())return product.descripcion;
 const descriptions={tools:'Equipa tu espacio de trabajo y prepara las herramientas para tu próximo proyecto.',materials:'Encuentra materiales para avanzar en tus proyectos de construcción y renovación.',paint:'Dale una nueva vida a tus espacios y prepara los detalles de tu próximo acabado.',plumbing:'Prepara tus proyectos de instalación, reparación y mantenimiento de plomería.',electric:'Organiza los materiales para tus proyectos de instalación y mantenimiento eléctrico.',safety:'Prepara tu equipo de protección antes de empezar a trabajar.'};
 return descriptions[productVisual(product)];
}
