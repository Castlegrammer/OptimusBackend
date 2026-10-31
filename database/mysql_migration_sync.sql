-- =============================================================================
-- MIGRACIÓN MYSQL PARA SINCRONIZACIÓN OPTIMUS360 (Compatible con phpMyAdmin)
-- Agrega las columnas de sincronización (uuid, cuenta_id, eliminado, updated_at)
-- sin borrar ni alterar los datos que ya tengas en tus tablas.
-- =============================================================================

-- 1. Tabla de Cuentas / Usuarios (Si no existe)
CREATE TABLE IF NOT EXISTS cuentas (
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

-- Usuario Admin por defecto si no existe (password: admin123)
INSERT INTO cuentas (id, uuid, nombre, email, password_hash, moneda, tipo) 
VALUES (
    1,
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Administrador',
    'admin@optimus360.com',
    '$2b$10$oI49RGjSF5uTWm/U1vB0UOVnXMC.tIhs6I3HYAJRavov1iku1AbNm',
    'USD',
    'Administrador'
) ON DUPLICATE KEY UPDATE id=id;

-- 2. Tabla de Logs de Sincronización (Si no existe)
CREATE TABLE IF NOT EXISTS sync_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    cuenta_id INT NOT NULL,
    dispositivo_id VARCHAR(100) DEFAULT 'desconocido',
    tipo_operacion ENUM('PUSH', 'PULL') NOT NULL,
    registros_afectados INT DEFAULT 0,
    detalles JSON DEFAULT NULL,
    ip_origen VARCHAR(45) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sync_cuenta (cuenta_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 3. PROCEDIMIENTO SEGURO PARA AGREGAR COLUMNAS EN MYSQL
-- (Evita errores de "Duplicate column name" o sintaxis no soportada en MySQL)
-- =============================================================================

DELIMITER $$

DROP PROCEDURE IF EXISTS AddColumnIfNotExists $$
CREATE PROCEDURE AddColumnIfNotExists(
    IN tableName VARCHAR(64),
    IN colName VARCHAR(64),
    IN colDef VARCHAR(255)
)
BEGIN
    DECLARE colExists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO colExists
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = tableName
      AND COLUMN_NAME = colName;
      
    IF colExists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE `', tableName, '` ADD COLUMN `', colName, '` ', colDef);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END $$

DROP PROCEDURE IF EXISTS AddIndexIfNotExists $$
CREATE PROCEDURE AddIndexIfNotExists(
    IN tableName VARCHAR(64),
    IN indexName VARCHAR(64),
    IN indexDef VARCHAR(255)
)
BEGIN
    DECLARE idxExists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO idxExists
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = tableName
      AND INDEX_NAME = indexName;
      
    IF idxExists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE `', tableName, '` ADD INDEX `', indexName, '` (', indexDef, ')');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END $$

DELIMITER ;

-- =============================================================================
-- 4. EJECUCIÓN DE MIGRACIONES EN TODAS LAS TABLAS EXISTENTES
-- =============================================================================

-- TABLA CATEGORIAS
CALL AddColumnIfNotExists('categorias', 'cuenta_id', 'INT NOT NULL DEFAULT 1');
CALL AddColumnIfNotExists('categorias', 'uuid', 'VARCHAR(36) NULL');
CALL AddColumnIfNotExists('categorias', 'eliminado', 'TINYINT(1) DEFAULT 0');
CALL AddColumnIfNotExists('categorias', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
CALL AddColumnIfNotExists('categorias', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

-- TABLA CLIENTES
CALL AddColumnIfNotExists('clientes', 'cuenta_id', 'INT NOT NULL DEFAULT 1');
CALL AddColumnIfNotExists('clientes', 'uuid', 'VARCHAR(36) NULL');
CALL AddColumnIfNotExists('clientes', 'eliminado', 'TINYINT(1) DEFAULT 0');
CALL AddColumnIfNotExists('clientes', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
CALL AddColumnIfNotExists('clientes', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

-- TABLA PROVEEDORES
CALL AddColumnIfNotExists('proveedores', 'cuenta_id', 'INT NOT NULL DEFAULT 1');
CALL AddColumnIfNotExists('proveedores', 'uuid', 'VARCHAR(36) NULL');
CALL AddColumnIfNotExists('proveedores', 'eliminado', 'TINYINT(1) DEFAULT 0');
CALL AddColumnIfNotExists('proveedores', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
CALL AddColumnIfNotExists('proveedores', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

-- TABLA PRODUCTOS
CALL AddColumnIfNotExists('productos', 'cuenta_id', 'INT NOT NULL DEFAULT 1');
CALL AddColumnIfNotExists('productos', 'uuid', 'VARCHAR(36) NULL');
CALL AddColumnIfNotExists('productos', 'categoria_uuid', 'VARCHAR(36) NULL');
CALL AddColumnIfNotExists('productos', 'proveedor_uuid', 'VARCHAR(36) NULL');
CALL AddColumnIfNotExists('productos', 'eliminado', 'TINYINT(1) DEFAULT 0');
CALL AddColumnIfNotExists('productos', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
CALL AddColumnIfNotExists('productos', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

-- TABLA VENTAS
CALL AddColumnIfNotExists('ventas', 'cuenta_id', 'INT NOT NULL DEFAULT 1');
CALL AddColumnIfNotExists('ventas', 'uuid', 'VARCHAR(36) NULL');
CALL AddColumnIfNotExists('ventas', 'cliente_uuid', 'VARCHAR(36) NULL');
CALL AddColumnIfNotExists('ventas', 'eliminado', 'TINYINT(1) DEFAULT 0');
CALL AddColumnIfNotExists('ventas', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
CALL AddColumnIfNotExists('ventas', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

-- TABLA VENTA_DETALLES
CALL AddColumnIfNotExists('venta_detalles', 'cuenta_id', 'INT NOT NULL DEFAULT 1');
CALL AddColumnIfNotExists('venta_detalles', 'uuid', 'VARCHAR(36) NULL');
CALL AddColumnIfNotExists('venta_detalles', 'venta_uuid', 'VARCHAR(36) NULL');
CALL AddColumnIfNotExists('venta_detalles', 'producto_uuid', 'VARCHAR(36) NULL');
CALL AddColumnIfNotExists('venta_detalles', 'eliminado', 'TINYINT(1) DEFAULT 0');
CALL AddColumnIfNotExists('venta_detalles', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
CALL AddColumnIfNotExists('venta_detalles', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

-- TABLA COMPRAS
CALL AddColumnIfNotExists('compras', 'cuenta_id', 'INT NOT NULL DEFAULT 1');
CALL AddColumnIfNotExists('compras', 'uuid', 'VARCHAR(36) NULL');
CALL AddColumnIfNotExists('compras', 'proveedor_uuid', 'VARCHAR(36) NULL');
CALL AddColumnIfNotExists('compras', 'eliminado', 'TINYINT(1) DEFAULT 0');
CALL AddColumnIfNotExists('compras', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
CALL AddColumnIfNotExists('compras', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

-- TABLA COMPRA_DETALLES
CALL AddColumnIfNotExists('compra_detalles', 'cuenta_id', 'INT NOT NULL DEFAULT 1');
CALL AddColumnIfNotExists('compra_detalles', 'uuid', 'VARCHAR(36) NULL');
CALL AddColumnIfNotExists('compra_detalles', 'compra_uuid', 'VARCHAR(36) NULL');
CALL AddColumnIfNotExists('compra_detalles', 'producto_uuid', 'VARCHAR(36) NULL');
CALL AddColumnIfNotExists('compra_detalles', 'eliminado', 'TINYINT(1) DEFAULT 0');
CALL AddColumnIfNotExists('compra_detalles', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
CALL AddColumnIfNotExists('compra_detalles', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

-- TABLA ABONOS_CLIENTES
CALL AddColumnIfNotExists('abonos_clientes', 'cuenta_id', 'INT NOT NULL DEFAULT 1');
CALL AddColumnIfNotExists('abonos_clientes', 'uuid', 'VARCHAR(36) NULL');
CALL AddColumnIfNotExists('abonos_clientes', 'cliente_uuid', 'VARCHAR(36) NULL');
CALL AddColumnIfNotExists('abonos_clientes', 'eliminado', 'TINYINT(1) DEFAULT 0');
CALL AddColumnIfNotExists('abonos_clientes', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
CALL AddColumnIfNotExists('abonos_clientes', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

-- TABLA PAGOS_PROVEEDORES
CALL AddColumnIfNotExists('pagos_proveedores', 'cuenta_id', 'INT NOT NULL DEFAULT 1');
CALL AddColumnIfNotExists('pagos_proveedores', 'uuid', 'VARCHAR(36) NULL');
CALL AddColumnIfNotExists('pagos_proveedores', 'proveedor_uuid', 'VARCHAR(36) NULL');
CALL AddColumnIfNotExists('pagos_proveedores', 'eliminado', 'TINYINT(1) DEFAULT 0');
CALL AddColumnIfNotExists('pagos_proveedores', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
CALL AddColumnIfNotExists('pagos_proveedores', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

-- =============================================================================
-- 5. ASIGNAR UUIDS AUTOMÁTICOS A REGISTROS PREVIOS QUE TENGAN UUID VACÍO O NULL
-- =============================================================================

UPDATE categorias SET uuid = UUID() WHERE uuid IS NULL OR uuid = '';
UPDATE clientes SET uuid = UUID() WHERE uuid IS NULL OR uuid = '';
UPDATE proveedores SET uuid = UUID() WHERE uuid IS NULL OR uuid = '';
UPDATE productos SET uuid = UUID() WHERE uuid IS NULL OR uuid = '';
UPDATE ventas SET uuid = UUID() WHERE uuid IS NULL OR uuid = '';
UPDATE venta_detalles SET uuid = UUID() WHERE uuid IS NULL OR uuid = '';
UPDATE compras SET uuid = UUID() WHERE uuid IS NULL OR uuid = '';
UPDATE compra_detalles SET uuid = UUID() WHERE uuid IS NULL OR uuid = '';
UPDATE abonos_clientes SET uuid = UUID() WHERE uuid IS NULL OR uuid = '';
UPDATE pagos_proveedores SET uuid = UUID() WHERE uuid IS NULL OR uuid = '';

-- =============================================================================
-- 6. ÍNDICES DE RENDIMIENTO PARA LA SINCRONIZACIÓN (BÚSQUEDA RÁPIDA POR FECHA Y UUID)
-- =============================================================================

CALL AddIndexIfNotExists('categorias', 'idx_cat_uuid', 'uuid');
CALL AddIndexIfNotExists('categorias', 'idx_cat_updated', 'cuenta_id, updated_at');

CALL AddIndexIfNotExists('clientes', 'idx_cli_uuid', 'uuid');
CALL AddIndexIfNotExists('clientes', 'idx_cli_updated', 'cuenta_id, updated_at');

CALL AddIndexIfNotExists('proveedores', 'idx_prov_uuid', 'uuid');
CALL AddIndexIfNotExists('proveedores', 'idx_prov_updated', 'cuenta_id, updated_at');

CALL AddIndexIfNotExists('productos', 'idx_prod_uuid', 'uuid');
CALL AddIndexIfNotExists('productos', 'idx_prod_updated', 'cuenta_id, updated_at');

CALL AddIndexIfNotExists('ventas', 'idx_venta_uuid', 'uuid');
CALL AddIndexIfNotExists('ventas', 'idx_venta_updated', 'cuenta_id, updated_at');

CALL AddIndexIfNotExists('venta_detalles', 'idx_vdet_uuid', 'uuid');
CALL AddIndexIfNotExists('venta_detalles', 'idx_vdet_updated', 'cuenta_id, updated_at');

-- Limpiar procedimientos temporales
DROP PROCEDURE IF EXISTS AddColumnIfNotExists;
DROP PROCEDURE IF EXISTS AddIndexIfNotExists;
