-- ============================================================
-- SCRIPT DE MIGRACIÓN PARA SQLite LOCAL EN ANDROID (B4A)
-- Añade soporte de UUID, Sync Status y Timestamps sin borrar datos
-- ============================================================

-- Categorías
ALTER TABLE Categorias ADD COLUMN uuid TEXT;
ALTER TABLE Categorias ADD COLUMN sync_status INTEGER DEFAULT 1;
ALTER TABLE Categorias ADD COLUMN updated_at TEXT;

-- Clientes
ALTER TABLE Clientes ADD COLUMN uuid TEXT;
ALTER TABLE Clientes ADD COLUMN sync_status INTEGER DEFAULT 1;
ALTER TABLE Clientes ADD COLUMN updated_at TEXT;

-- Proveedores
ALTER TABLE Proveedores ADD COLUMN uuid TEXT;
ALTER TABLE Proveedores ADD COLUMN sync_status INTEGER DEFAULT 1;
ALTER TABLE Proveedores ADD COLUMN updated_at TEXT;

-- Productos
ALTER TABLE Productos ADD COLUMN uuid TEXT;
ALTER TABLE Productos ADD COLUMN sync_status INTEGER DEFAULT 1;
ALTER TABLE Productos ADD COLUMN updated_at TEXT;

-- Ventas
ALTER TABLE Ventas ADD COLUMN uuid TEXT;
ALTER TABLE Ventas ADD COLUMN sync_status INTEGER DEFAULT 1;
ALTER TABLE Ventas ADD COLUMN updated_at TEXT;

-- VentaDetalles
ALTER TABLE VentaDetalles ADD COLUMN uuid TEXT;
ALTER TABLE VentaDetalles ADD COLUMN sync_status INTEGER DEFAULT 1;
ALTER TABLE VentaDetalles ADD COLUMN updated_at TEXT;

-- Compras
ALTER TABLE Compras ADD COLUMN uuid TEXT;
ALTER TABLE Compras ADD COLUMN sync_status INTEGER DEFAULT 1;
ALTER TABLE Compras ADD COLUMN updated_at TEXT;

-- CompraDetalles
ALTER TABLE CompraDetalles ADD COLUMN uuid TEXT;
ALTER TABLE CompraDetalles ADD COLUMN sync_status INTEGER DEFAULT 1;
ALTER TABLE CompraDetalles ADD COLUMN updated_at TEXT;

-- AbonosClientes
ALTER TABLE AbonosClientes ADD COLUMN uuid TEXT;
ALTER TABLE AbonosClientes ADD COLUMN sync_status INTEGER DEFAULT 1;
ALTER TABLE AbonosClientes ADD COLUMN updated_at TEXT;

-- PagosAProveedores
ALTER TABLE PagosAProveedores ADD COLUMN uuid TEXT;
ALTER TABLE PagosAProveedores ADD COLUMN sync_status INTEGER DEFAULT 1;
ALTER TABLE PagosAProveedores ADD COLUMN updated_at TEXT;

-- Tabla de configuración local de sincronización
CREATE TABLE IF NOT EXISTS SyncConfig (
    Clave TEXT PRIMARY KEY,
    Valor TEXT
);

-- Registros iniciales de sincronización
INSERT OR IGNORE INTO SyncConfig (Clave, Valor) VALUES ('last_sync_timestamp', '1970-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO SyncConfig (Clave, Valor) VALUES ('api_url', 'http://tu-servidor:3000/api/v1');
INSERT OR IGNORE INTO SyncConfig (Clave, Valor) VALUES ('auth_token', '');
INSERT OR IGNORE INTO SyncConfig (Clave, Valor) VALUES ('device_id', '');
