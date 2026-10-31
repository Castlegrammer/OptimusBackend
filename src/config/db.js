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
    
    // Auto-verificar tabla Cuenta
    await initDatabaseTables();
    return true;
  } catch (error) {
    console.error('❌ Error de conexión con MySQL:', error.message);
    return false;
  }
}

export async function initDatabaseTables() {
  try {
    // 1. Asegurar tabla Cuenta (PascalCase) exactamente como está en el sistema
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`Cuenta\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`IDCuenta\` INT DEFAULT 1,
        \`uuid\` VARCHAR(36) NOT NULL UNIQUE,
        \`Nombre\` VARCHAR(150) NOT NULL,
        \`email\` VARCHAR(150) NOT NULL UNIQUE,
        \`Clave\` VARCHAR(255) DEFAULT '',
        \`password_hash\` VARCHAR(255) DEFAULT NULL,
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

    // 2. Si la tabla Cuenta está vacía, insertar cuenta Administrador inicial (password: admin123)
    const [existing] = await pool.query('SELECT COUNT(*) as count FROM `Cuenta`');
    if (existing[0].count === 0) {
      const defaultHash = '$2b$10$oI49RGjSF5uTWm/U1vB0UOVnXMC.tIhs6I3HYAJRavov1iku1AbNm';
      await pool.query(`
        INSERT INTO \`Cuenta\` (id, IDCuenta, uuid, Nombre, email, Clave, password_hash, Moneda, Tipo, Fecha)
        VALUES (1, 1, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Administrador', 'admin@optimus360.com', 'admin123', ?, 'USD', 'Administrador', CURDATE())
        ON DUPLICATE KEY UPDATE id=id
      `, [defaultHash]);
    }

    console.log('✅ Tabla Cuenta lista y verificada en MySQL');
  } catch (err) {
    console.error('⚠️ Estado de tabla Cuenta en MySQL:', err.message);
  }
}
