// Recursos de presentación: los datos comerciales siguen viniendo de MySQL.
export function productVisual(product={}){
 const value=`${product.nombre||''} ${product.categoria||''}`.toLowerCase();
 if(/martillo/.test(value))return 'hammer';
 if(/taladro|atornillador/.test(value))return 'drill';
 if(/alicate|pinza/.test(value))return 'pliers';
 if(/destornillador/.test(value))return 'screwdriver';
 if(/sierra|serrucho/.test(value))return 'saw';
 if(/cinta|medici|metro/.test(value))return 'measure';
 if(/guante|jardin|jardín|podar/.test(value))return 'gloves';
 if(/casco|seguridad|protección/.test(value))return 'helmet';
 if(/pint|brocha|rodillo/.test(value))return 'paint';
 if(/cemento|bloque|arena|construcción|construccion/.test(value))return 'construction';
 if(/bombill|lámpara|lampara|eléctr|electr|led/.test(value))return 'bulb';
 if(/tubo|pvc/.test(value))return 'pipe';
 if(/plomer|fontaner|grifo/.test(value))return 'wrench';
 return 'workbench';
}
export const photoPath=name=>`/photos/${name}.${["paint","pipe","bulb","drill","hammer","pliers","wrench","screwdriver"].includes(name)?"webp":"avif"}`;
export function productDescription(product={}){
 return product.descripcion?.trim() || 'La tienda todavía no ha añadido una descripción para este producto. Consulta los detalles antes de preparar tu pedido.';
}
export function productPrice(product={}){
 const raw=product.precio_actual??product.precio;
 const value=raw===null||raw===undefined||raw===''?NaN:Number(raw);
 return Number.isFinite(value)&&value>0?value:null;
}
