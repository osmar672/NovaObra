USE novaobra_db;
START TRANSACTION;
INSERT INTO categorias (id_categoria,nombre,descripcion) VALUES (1,'Herramientas','Herramientas manuales'),(2,'Construcción','Materiales'),(3,'Electricidad','Material eléctrico'),(4,'Plomería','Tuberías y accesorios');
INSERT INTO proveedores (id_proveedor,nombre,telefono,correo,direccion) VALUES (1,'Distribuidora Central','22223333','ventas@example.com','San José');
INSERT INTO clientes (id_cliente,nombre,telefono,correo,direccion) VALUES (1,'Cliente de mostrador','88887777','cliente@example.com','San José');
INSERT INTO empleados (id_empleado,nombre,apellido,puesto,fecha_ingreso) VALUES (1,'Ana','Mora','Administración','2026-01-01');
INSERT INTO productos (id_producto,id_categoria,codigo,nombre,descripcion,precio_compra,precio_venta,stock_minimo) VALUES
(1,1,'HER-001','Martillo','Martillo de acero',2500,4000,5),
(2,2,'CON-001','Cemento 50 kg','Uso general',5000,6500,10),
(3,3,'ELE-001','Cable eléctrico','Por metro',300,500,20),
(4,4,'PLO-001','Tubo PVC','Media pulgada',1500,2200,8);
INSERT INTO compras (id_compra,id_proveedor,id_empleado,total,estado,clave_solicitud) VALUES (1,1,1,50000,'confirmada','semilla-compra-1');
INSERT INTO detalle_compras (id_compra,id_producto,cantidad,costo_unitario) VALUES (1,1,20,2500);
UPDATE productos SET stock=20 WHERE id_producto=1;
INSERT INTO movimientos_inventario (id_producto,tipo_movimiento,cantidad,descripcion) VALUES (1,'entrada',20,'Confirmación compra #1');
INSERT INTO ventas (id_venta,id_cliente,id_empleado,total,estado,clave_solicitud) VALUES (1,1,1,8000,'confirmada','semilla-venta-1');
INSERT INTO detalle_ventas (id_venta,id_producto,cantidad,precio_unitario) VALUES (1,1,2,4000);
UPDATE productos SET stock=18 WHERE id_producto=1;
INSERT INTO movimientos_inventario (id_producto,tipo_movimiento,cantidad,descripcion) VALUES (1,'salida',2,'Confirmación venta #1');
COMMIT;
