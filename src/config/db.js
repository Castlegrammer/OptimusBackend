import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'optimus360',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  timezone: '+00:00'
});

export async function testDbConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('✅ Conexión exitosa con la base de datos MySQL');
    
    // Auto-inicializar tablas necesarias si no existen
    await initDatabaseTables();
    return true;
  } catch (error) {
    console.error('❌ Error de conexión con MySQL:', error.message);
    return false;
  }
}

export async function initDatabaseTables() {
  try {
    // 1. Crear tabla cuentas (minúscula) si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`cuentas\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` VARCHAR(36) NOT NULL UNIQUE,
        \`nombre\` VARCHAR(150) NOT NULL,
        \`email\` VARCHAR(150) NOT NULL UNIQUE,
        \`password_hash\` VARCHAR(255) NOT NULL,
        \`moneda\` VARCHAR(10) DEFAULT 'USD',
        \`tipo\` VARCHAR(50) DEFAULT 'Administrador',
        \`activo\` TINYINT(1) DEFAULT 1,
        \`eliminado\` TINYINT(1) DEFAULT 0,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_cuentas_email (email),
        INDEX idx_cuentas_uuid (uuid)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Crear tabla Cuenta (PascalCase) para compatibilidad con Android SQLite
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`Cuenta\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`IDCuenta\` INT DEFAULT 1,
        \`uuid\` VARCHAR(36) NOT NULL UNIQUE,
        \`Nombre\` VARCHAR(150) NOT NULL,
        \`email\` VARCHAR(150) NOT NULL UNIQUE,
        \`Clave\` VARCHAR(255) DEFAULT '',
        \`password_hash\` VARCHAR(255) NOT NULL,
        \`Moneda\` VARCHAR(10) DEFAULT 'USD',
        \`Tipo\` VARCHAR(50) DEFAULT 'Administrador',
        \`Fecha\` VARCHAR(50) DEFAULT '',
        \`activo\` TINYINT(1) DEFAULT 1,
        \`eliminado\` TINYINT(1) DEFAULT 0,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_cuenta_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Crear tabla categorias si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`categorias\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`cuenta_id\` INT NOT NULL DEFAULT 1,
        \`uuid\` VARCHAR(36) NOT NULL,
        \`nombre\` VARCHAR(100) NOT NULL,
        \`eliminado\` TINYINT(1) DEFAULT 0,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Crear tabla productos si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`productos\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`cuenta_id\` INT NOT NULL DEFAULT 1,
        \`uuid\` VARCHAR(36) NOT NULL,
        \`nombre\` VARCHAR(200) NOT NULL,
        \`codigo\` VARCHAR(50) DEFAULT '',
        \`categoria\` VARCHAR(100) DEFAULT '',
        \`precio_costo\` DECIMAL(12,2) DEFAULT 0.00,
        \`precio_venta\` DECIMAL(12,2) DEFAULT 0.00,
        \`precio_mayor\` DECIMAL(12,2) DEFAULT 0.00,
        \`stock\` DECIMAL(10,2) DEFAULT 0.00,
        \`stock_minimo\` DECIMAL(10,2) DEFAULT 0.00,
        \`unidad_medida\` VARCHAR(50) DEFAULT 'UNIDAD',
        \`moneda\` VARCHAR(10) DEFAULT 'USD',
        \`eliminado\` TINYINT(1) DEFAULT 0,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Crear tabla clientes si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`clientes\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`cuenta_id\` INT NOT NULL DEFAULT 1,
        \`uuid\` VARCHAR(36) NOT NULL,
        \`nombre\` VARCHAR(150) NOT NULL,
        \`telefono\` VARCHAR(50) DEFAULT '',
        \`direccion\` TEXT DEFAULT NULL,
        \`deuda\` DECIMAL(12,2) DEFAULT 0.00,
        \`limite_credito\` DECIMAL(12,2) DEFAULT 0.00,
        \`eliminado\` TINYINT(1) DEFAULT 0,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. Crear tabla ventas si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`ventas\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`cuenta_id\` INT NOT NULL DEFAULT 1,
        \`uuid\` VARCHAR(36) NOT NULL,
        \`cliente_uuid\` VARCHAR(36) DEFAULT NULL,
        \`cliente_nombre\` VARCHAR(150) DEFAULT 'Cliente General',
        \`total\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        \`metodo_pago\` VARCHAR(50) DEFAULT 'Efectivo USD',
        \`estado\` VARCHAR(50) DEFAULT 'Completada',
        \`fecha\` VARCHAR(50) DEFAULT '',
        \`eliminado\` TINYINT(1) DEFAULT 0,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. Insertar usuario Admin por defecto si la tabla está vacía (password: admin123)
    const defaultHash = '$2b$10$oI49RGjSF5uTWm/U1vB0UOVnXMC.tIhs6I3HYAJRavov1iku1AbNm';
    try {
      const [existing] = await pool.query('SELECT COUNT(*) as count FROM `cuentas`');
      if (existing[0].count === 0) {
        await pool.query(`
          INSERT INTO \`cuentas\` (id, uuid, nombre, email, password_hash, moneda, tipo)
          VALUES (1, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Administrador', 'admin@optimus360.com', ?, 'USD', 'Administrador')
          ON DUPLICATE KEY UPDATE id=id
        `, [defaultHash]);
      }
    } catch (e1) {}

    try {
      const [existingC] = await pool.query('SELECT COUNT(*) as count FROM `Cuenta`');
      if (existingC[0].count === 0) {
        await pool.query(`
          INSERT INTO \`Cuenta\` (id, IDCuenta, uuid, Nombre, email, Clave, password_hash, Moneda, Tipo, Fecha)
          VALUES (1, 1, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Administrador', 'admin@optimus360.com', 'admin123', ?, 'USD', 'Administrador', CURDATE())
          ON DUPLICATE KEY UPDATE id=id
        `, [defaultHash]);
      }
    } catch (e2) {}

    console.log('✅ Tablas de base de datos verificadas y migradas exitosamente');
  } catch (err) {
    console.error('⚠️ Error al inicializar tablas en MySQL:', err.message);
  }
}
