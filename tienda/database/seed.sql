-- Datos DEMOSTRATIVOS opcionales. No crea cuentas ni contraseñas predeterminadas.
INSERT INTO categorias (nombre, descripcion) VALUES
 ('Herramientas','Herramientas manuales, eléctricas y accesorios'),
 ('Construcción','Materiales para construir y renovar'),
 ('Electricidad','Iluminación y accesorios eléctricos'),
 ('Fontanería','Tuberías, conexiones y accesorios'),
 ('Pintura','Preparación y acabados'),
 ('Jardinería','Cuidado de exteriores');
INSERT INTO marcas (nombre, descripcion) VALUES ('Demostración','Marca de ejemplo: sustituir antes de publicar');
INSERT INTO productos (categoria_id,marca_id,sku,nombre,descripcion,especificaciones,precio,destacado) VALUES
 (1,1,'DEMO-TALADRO','Taladro percutor 650 W','Producto de demostración para verificar el catálogo.','Potencia: 650 W. Mandril: 13 mm.',29900,1),
 (1,1,'DEMO-MARTILLO','Martillo de uña','Producto de demostración.','Peso: 16 oz. Mango antideslizante.',6500,1),
 (2,1,'DEMO-CEMENTO','Cemento gris 50 kg','Producto de demostración.','Presentación: saco de 50 kg.',7250,1),
 (3,1,'DEMO-LED','Bombillo LED 9 W','Producto de demostración.','Potencia: 9 W. Rosca E27.',1800,0),
 (4,1,'DEMO-TUBO','Tubo PVC de ½ pulgada','Producto de demostración.','Diámetro: ½ pulgada. Longitud: 6 m.',3100,0),
 (5,1,'DEMO-PINTURA','Pintura blanca para interiores','Producto de demostración.','Acabado mate. Presentación: un galón.',14900,1),
 (6,1,'DEMO-TIJERA','Tijera de podar','Producto de demostración.','Corte de ramas de hasta 20 mm.',8900,0);
INSERT INTO inventario (producto_id) SELECT id FROM productos;
-- Stock inicial cero: registrar entradas reales en Administración > Inventario.
