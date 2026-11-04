-- MySQL 8.0.16+. Diez tablas en una base exclusiva. Sin DROP ni datos personales.
CREATE TABLE IF NOT EXISTS roles (
 id TINYINT UNSIGNED PRIMARY KEY,
 nombre VARCHAR(20) NOT NULL UNIQUE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS usuarios (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 rol_id TINYINT UNSIGNED NOT NULL,
 nombre VARCHAR(120) NOT NULL,
 email VARCHAR(190) NOT NULL UNIQUE,
 password_hash VARCHAR(200) NOT NULL,
 activo BOOLEAN NOT NULL DEFAULT TRUE,
 version_sesion INT UNSIGNED NOT NULL DEFAULT 0,
 creado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (rol_id) REFERENCES roles(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS clientes (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 usuario_id INT UNSIGNED NOT NULL UNIQUE,
 telefono VARCHAR(30) NOT NULL DEFAULT '',
 direccion VARCHAR(500) NOT NULL DEFAULT '',
 FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS categorias (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 nombre VARCHAR(100) NOT NULL UNIQUE,
 descripcion VARCHAR(500) NOT NULL DEFAULT '',
 activo BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS marcas (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 nombre VARCHAR(100) NOT NULL UNIQUE,
 descripcion VARCHAR(500) NOT NULL DEFAULT '',
 activo BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS productos (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 categoria_id INT UNSIGNED NOT NULL,
 marca_id INT UNSIGNED NOT NULL,
 sku VARCHAR(60) NOT NULL UNIQUE,
 nombre VARCHAR(160) NOT NULL,
 descripcion TEXT NOT NULL,
 especificaciones TEXT NOT NULL,
 imagen VARCHAR(1000) NOT NULL DEFAULT '',
 precio DECIMAL(12,2) NOT NULL,
 precio_oferta DECIMAL(12,2) NULL,
 oferta_inicio DATETIME NULL,
 oferta_fin DATETIME NULL,
 destacado BOOLEAN NOT NULL DEFAULT FALSE,
 activo BOOLEAN NOT NULL DEFAULT TRUE,
 creado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (categoria_id) REFERENCES categorias(id),
 FOREIGN KEY (marca_id) REFERENCES marcas(id),
 CONSTRAINT ck_precio CHECK (precio > 0),
 CONSTRAINT ck_oferta CHECK (precio_oferta IS NULL OR (precio_oferta > 0 AND precio_oferta < precio)),
 CONSTRAINT ck_fechas CHECK ((precio_oferta IS NULL AND oferta_inicio IS NULL AND oferta_fin IS NULL) OR (precio_oferta IS NOT NULL AND oferta_inicio IS NOT NULL AND oferta_fin IS NOT NULL AND oferta_fin > oferta_inicio)),
 INDEX ix_catalogo (activo, categoria_id, marca_id, precio)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS inventario (
 producto_id INT UNSIGNED PRIMARY KEY,
 existencia INT NOT NULL DEFAULT 0,
 minimo INT NOT NULL DEFAULT 5,
 FOREIGN KEY (producto_id) REFERENCES productos(id),
 CONSTRAINT ck_existencia CHECK (existencia >= 0),
 CONSTRAINT ck_minimo CHECK (minimo >= 0)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS pedidos (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 cliente_id INT UNSIGNED NOT NULL,
 clave VARCHAR(64) NOT NULL,
 tipo ENUM('pedido','cotizacion') NOT NULL DEFAULT 'pedido',
 estado ENUM('pendiente','confirmado','preparando','listo','enviado','entregado','cancelado') NOT NULL DEFAULT 'pendiente',
 entrega ENUM('retiro','domicilio') NOT NULL,
 direccion VARCHAR(500) NOT NULL DEFAULT '',
 telefono VARCHAR(30) NOT NULL,
 nota VARCHAR(1000) NOT NULL DEFAULT '',
 costo_entrega DECIMAL(12,2) NOT NULL DEFAULT 0,
 creado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 actualizado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY (cliente_id) REFERENCES clientes(id),
 UNIQUE KEY ix_idempotencia (cliente_id, clave),
 INDEX ix_estado (estado, creado),
 CHECK (costo_entrega >= 0)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS detalle_pedidos (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 pedido_id INT UNSIGNED NOT NULL,
 producto_id INT UNSIGNED NOT NULL,
 cantidad INT NOT NULL,
 precio_unitario DECIMAL(12,2) NOT NULL,
 FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
 FOREIGN KEY (producto_id) REFERENCES productos(id),
 UNIQUE KEY ix_linea (pedido_id, producto_id),
 CHECK (cantidad > 0 AND precio_unitario > 0)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS movimientos_inventario (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 producto_id INT UNSIGNED NOT NULL,
 usuario_id INT UNSIGNED NOT NULL,
 pedido_id INT UNSIGNED NULL,
 cantidad INT NOT NULL,
 motivo VARCHAR(200) NOT NULL,
 creado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (producto_id) REFERENCES productos(id),
 FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
 FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
 INDEX ix_movimiento (producto_id, creado),
 CHECK (cantidad <> 0)
) ENGINE=InnoDB;
