CREATE DATABASE IF NOT EXISTS novaobra_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE novaobra_db;

CREATE TABLE IF NOT EXISTS categorias (
  id_categoria INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL UNIQUE,
  descripcion VARCHAR(255) NULL,
  estado ENUM('activo','inactivo') NOT NULL DEFAULT 'activo'
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS proveedores (
  id_proveedor INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  telefono VARCHAR(255) NULL,
  correo VARCHAR(255) NULL,
  direccion VARCHAR(255) NULL,
  estado ENUM('activo','inactivo') NOT NULL DEFAULT 'activo'
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS productos (
  id_producto INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_categoria INT UNSIGNED NOT NULL,
  codigo VARCHAR(120) NOT NULL UNIQUE,
  nombre VARCHAR(120) NOT NULL,
  descripcion VARCHAR(255) NULL,
  precio_compra DECIMAL(12,2) NOT NULL CHECK (precio_compra >= 0),
  precio_venta DECIMAL(12,2) NOT NULL CHECK (precio_venta >= 0),
  stock_minimo INT NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
  estado ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
  stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS clientes (
  id_cliente INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  telefono VARCHAR(255) NULL,
  correo VARCHAR(255) NULL,
  direccion VARCHAR(255) NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS empleados (
  id_empleado INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  apellido VARCHAR(120) NOT NULL,
  puesto VARCHAR(120) NOT NULL,
  telefono VARCHAR(255) NULL,
  correo VARCHAR(255) NULL,
  fecha_ingreso DATE NOT NULL,
  estado ENUM('activo','inactivo') NOT NULL DEFAULT 'activo'
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS compras (
 id_compra INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 id_proveedor INT UNSIGNED NOT NULL,
 id_empleado INT UNSIGNED NOT NULL,
 fecha_compra DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 total DECIMAL(14,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
 estado ENUM('borrador','confirmada','cancelada') NOT NULL DEFAULT 'borrador',
 clave_solicitud VARCHAR(80) NULL UNIQUE,
 FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor) ON DELETE RESTRICT,
 FOREIGN KEY (id_empleado) REFERENCES empleados(id_empleado) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS detalle_compras (
 id_detalle_compra INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 id_compra INT UNSIGNED NOT NULL,
 id_producto INT UNSIGNED NOT NULL,
 cantidad INT NOT NULL CHECK (cantidad > 0),
 costo_unitario DECIMAL(12,2) NOT NULL CHECK (costo_unitario >= 0),
 subtotal DECIMAL(14,2) GENERATED ALWAYS AS (cantidad * costo_unitario) STORED,
 UNIQUE (id_compra, id_producto),
 FOREIGN KEY (id_compra) REFERENCES compras(id_compra) ON DELETE RESTRICT,
 FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ventas (
 id_venta INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 id_cliente INT UNSIGNED NOT NULL,
 id_empleado INT UNSIGNED NOT NULL,
 fecha_venta DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 total DECIMAL(14,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
 estado ENUM('borrador','confirmada','cancelada') NOT NULL DEFAULT 'borrador',
 clave_solicitud VARCHAR(80) NULL UNIQUE,
 FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE RESTRICT,
 FOREIGN KEY (id_empleado) REFERENCES empleados(id_empleado) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS detalle_ventas (
 id_detalle_venta INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 id_venta INT UNSIGNED NOT NULL,
 id_producto INT UNSIGNED NOT NULL,
 cantidad INT NOT NULL CHECK (cantidad > 0),
 precio_unitario DECIMAL(12,2) NOT NULL CHECK (precio_unitario >= 0),
 subtotal DECIMAL(14,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
 UNIQUE (id_venta, id_producto),
 FOREIGN KEY (id_venta) REFERENCES ventas(id_venta) ON DELETE RESTRICT,
 FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS movimientos_inventario (
 id_movimiento INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 id_producto INT UNSIGNED NOT NULL,
 tipo_movimiento ENUM('entrada','salida') NOT NULL,
 cantidad INT NOT NULL CHECK (cantidad > 0),
 fecha_movimiento DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 descripcion VARCHAR(255) NOT NULL,
 clave_solicitud VARCHAR(80) NULL UNIQUE,
 FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE RESTRICT
) ENGINE=InnoDB;
