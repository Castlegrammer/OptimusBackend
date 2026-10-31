-- ============================================================
-- BASE DE DATOS CENTRAL OPTIMUS360 (MySQL / phpMyAdmin)
-- Sistema de Sincronización Remota Bidireccional (Android - Web)
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS sync_logs;
DROP TABLE IF EXISTS pagos_proveedores;
DROP TABLE IF EXISTS abonos_clientes;
DROP TABLE IF EXISTS compra_detalles;
DROP TABLE IF EXISTS compras;
DROP TABLE IF EXISTS venta_detalles;
DROP TABLE IF EXISTS ventas;
DROP TABLE IF EXISTS productos;
DROP TABLE IF EXISTS proveedores;
DROP TABLE IF EXISTS clientes;
DROP TABLE IF EXISTS categorias;
DROP TABLE IF EXISTS cuentas;
SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------
-- 1. Tabla de Cuentas / Tenants / Usuarios
-- ------------------------------------------------------------
CREATE TABLE cuentas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    moneda VARCHAR(10) DEFAULT 'USD',
    tipo VARCHAR(50) DEFAULT 'Administrador',
    activo TINYINT(1) DEFAULT 1,
    eliminado TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cuentas_email (email),
    INDEX idx_cuentas_uuid (uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 2. Categorías
-- ------------------------------------------------------------
CREATE TABLE categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cuenta_id INT NOT NULL,
    uuid VARCHAR(36) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    eliminado TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_cat_uuid_cuenta (cuenta_id, uuid),
    INDEX idx_cat_updated (cuenta_id, updated_at),
    FOREIGN KEY (cuenta_id) REFERENCES cuentas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3. Clientes
-- ------------------------------------------------------------
CREATE TABLE clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cuenta_id INT NOT NULL,
    uuid VARCHAR(36) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    responsable VARCHAR(150) DEFAULT '',
    direccion TEXT DEFAULT NULL,
    telefono VARCHAR(50) DEFAULT '',
    zona VARCHAR(100) DEFAULT '',
    fecha_creacion VARCHAR(50) DEFAULT '',
    eliminado TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_cli_uuid_cuenta (cuenta_id, uuid),
    INDEX idx_cli_updated (cuenta_id, updated_at),
    FOREIGN KEY (cuenta_id) REFERENCES cuentas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 4. Proveedores
-- ------------------------------------------------------------
CREATE TABLE proveedores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cuenta_id INT NOT NULL,
    uuid VARCHAR(36) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    responsable VARCHAR(150) DEFAULT '',
    direccion TEXT DEFAULT NULL,
    telefono VARCHAR(50) DEFAULT '',
    zona VARCHAR(100) DEFAULT '',
    fecha_creacion VARCHAR(50) DEFAULT '',
    eliminado TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_prov_uuid_cuenta (cuenta_id, uuid),
    INDEX idx_prov_updated (cuenta_id, updated_at),
    FOREIGN KEY (cuenta_id) REFERENCES cuentas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 5. Productos
-- ------------------------------------------------------------
CREATE TABLE productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cuenta_id INT NOT NULL,
    uuid VARCHAR(36) NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT DEFAULT NULL,
    categoria VARCHAR(100) DEFAULT '',
    categoria_uuid VARCHAR(36) DEFAULT NULL,
    proveedor VARCHAR(150) DEFAULT '',
    proveedor_uuid VARCHAR(36) DEFAULT NULL,
    marca VARCHAR(100) DEFAULT '',
    tamano VARCHAR(50) DEFAULT '',
    color VARCHAR(50) DEFAULT '',
    cantidad DECIMAL(12, 2) DEFAULT 0.00,
    costo DECIMAL(12, 2) DEFAULT 0.00,
    precio DECIMAL(12, 2) DEFAULT 0.00,
    unidad VARCHAR(50) DEFAULT 'Unidad',
    maximo DECIMAL(12, 2) DEFAULT 0.00,
    minimo DECIMAL(12, 2) DEFAULT 0.00,
    fecha_vencimiento VARCHAR(50) DEFAULT '',
    foto LONGTEXT DEFAULT NULL,
    eliminado TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_prod_uuid_cuenta (cuenta_id, uuid),
    INDEX idx_prod_updated (cuenta_id, updated_at),
    INDEX idx_prod_nombre (cuenta_id, nombre),
    FOREIGN KEY (cuenta_id) REFERENCES cuentas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 6. Ventas
-- ------------------------------------------------------------
CREATE TABLE ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cuenta_id INT NOT NULL,
    uuid VARCHAR(36) NOT NULL,
    cliente VARCHAR(150) DEFAULT '',
    cliente_uuid VARCHAR(36) DEFAULT NULL,
    fecha VARCHAR(50) NOT NULL,
    total DECIMAL(12, 2) DEFAULT 0.00,
    inicial DECIMAL(12, 2) DEFAULT 0.00,
    eliminado TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_venta_uuid_cuenta (cuenta_id, uuid),
    INDEX idx_venta_updated (cuenta_id, updated_at),
    FOREIGN KEY (cuenta_id) REFERENCES cuentas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 7. Venta Detalles
-- ------------------------------------------------------------
CREATE TABLE venta_detalles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cuenta_id INT NOT NULL,
    uuid VARCHAR(36) NOT NULL,
    venta_uuid VARCHAR(36) NOT NULL,
    producto_uuid VARCHAR(36) DEFAULT NULL,
    producto VARCHAR(200) NOT NULL,
    cantidad DECIMAL(12, 2) NOT NULL,
    precio DECIMAL(12, 2) NOT NULL,
    total DECIMAL(12, 2) NOT NULL,
    fecha VARCHAR(50) DEFAULT '',
    eliminado TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_vdet_uuid_cuenta (cuenta_id, uuid),
    INDEX idx_vdet_venta (cuenta_id, venta_uuid),
    INDEX idx_vdet_updated (cuenta_id, updated_at),
    FOREIGN KEY (cuenta_id) REFERENCES cuentas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 8. Compras
-- ------------------------------------------------------------
CREATE TABLE compras (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cuenta_id INT NOT NULL,
    uuid VARCHAR(36) NOT NULL,
    proveedor VARCHAR(150) DEFAULT '',
    proveedor_uuid VARCHAR(36) DEFAULT NULL,
    fecha VARCHAR(50) NOT NULL,
    total DECIMAL(12, 2) DEFAULT 0.00,
    inicial DECIMAL(12, 2) DEFAULT 0.00,
    eliminado TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_compra_uuid_cuenta (cuenta_id, uuid),
    INDEX idx_compra_updated (cuenta_id, updated_at),
    FOREIGN KEY (cuenta_id) REFERENCES cuentas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 9. Compra Detalles
-- ------------------------------------------------------------
CREATE TABLE compra_detalles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cuenta_id INT NOT NULL,
    uuid VARCHAR(36) NOT NULL,
    compra_uuid VARCHAR(36) NOT NULL,
    producto_uuid VARCHAR(36) DEFAULT NULL,
    producto VARCHAR(200) NOT NULL,
    cantidad DECIMAL(12, 2) NOT NULL,
    precio DECIMAL(12, 2) NOT NULL,
    total DECIMAL(12, 2) NOT NULL,
    fecha VARCHAR(50) DEFAULT '',
    eliminado TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_cdet_uuid_cuenta (cuenta_id, uuid),
    INDEX idx_cdet_compra (cuenta_id, compra_uuid),
    INDEX idx_cdet_updated (cuenta_id, updated_at),
    FOREIGN KEY (cuenta_id) REFERENCES cuentas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 10. Abonos de Clientes
-- ------------------------------------------------------------
CREATE TABLE abonos_clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cuenta_id INT NOT NULL,
    uuid VARCHAR(36) NOT NULL,
    cliente VARCHAR(150) DEFAULT '',
    cliente_uuid VARCHAR(36) DEFAULT NULL,
    fecha VARCHAR(50) NOT NULL,
    monto DECIMAL(12, 2) NOT NULL,
    eliminado TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_abono_uuid_cuenta (cuenta_id, uuid),
    INDEX idx_abono_updated (cuenta_id, updated_at),
    FOREIGN KEY (cuenta_id) REFERENCES cuentas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 11. Pagos a Proveedores
-- ------------------------------------------------------------
CREATE TABLE pagos_proveedores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cuenta_id INT NOT NULL,
    uuid VARCHAR(36) NOT NULL,
    proveedor VARCHAR(150) DEFAULT '',
    proveedor_uuid VARCHAR(36) DEFAULT NULL,
    fecha VARCHAR(50) NOT NULL,
    monto DECIMAL(12, 2) NOT NULL,
    eliminado TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_pago_uuid_cuenta (cuenta_id, uuid),
    INDEX idx_pago_updated (cuenta_id, updated_at),
    FOREIGN KEY (cuenta_id) REFERENCES cuentas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 12. Logs de Sincronización
-- ------------------------------------------------------------
CREATE TABLE sync_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    cuenta_id INT NOT NULL,
    dispositivo_id VARCHAR(100) DEFAULT 'desconocido',
    tipo_operacion ENUM('PUSH', 'PULL') NOT NULL,
    registros_afectados INT DEFAULT 0,
    detalles JSON DEFAULT NULL,
    ip_origen VARCHAR(45) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sync_cuenta (cuenta_id, created_at),
    FOREIGN KEY (cuenta_id) REFERENCES cuentas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Registro de Usuario de Prueba Inicial
-- Password predeterminado: admin123 (hash bcrypt con 10 rounds)
-- ------------------------------------------------------------
INSERT INTO cuentas (uuid, nombre, email, password_hash, moneda, tipo) 
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Administrador Demo',
    'admin@optimus360.com',
    '$2b$10$oI49RGjSF5uTWm/U1vB0UOVnXMC.tIhs6I3HYAJRavov1iku1AbNm', -- admin123
    'USD',
    'Administrador'
) ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), password_hash=VALUES(password_hash);
