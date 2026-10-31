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
  const reports = [];

  // Helper para añadir columnas de forma segura
  async function ensureCol(table, col, colDef) {
    try {
      await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${col}\` ${colDef}`);
      reports.push(`${table}: ${col} añadida`);
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME' || e.errno === 1060) {
        reports.push(`${table}: ${col} ya existe`);
      } else {
        reports.push(`${table} ${col} err: ${e.message}`);
      }
    }
  }

  // 1. Asegurar columnas de Categorías (aislado por cuenta_id de usuario)
  await ensureCol('Categorias', 'cuenta_id', 'INT DEFAULT 1');
  await ensureCol('Categorias', 'uuid', 'VARCHAR(36) DEFAULT NULL');
  await ensureCol('Categorias', 'eliminado', 'TINYINT(1) DEFAULT 0');
  await ensureCol('Categorias', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
  await ensureCol('Categorias', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

  // 2. Asegurar columnas de Proveedores
  await ensureCol('Proveedores', 'cuenta_id', 'INT DEFAULT 1');
  await ensureCol('Proveedores', 'uuid', 'VARCHAR(36) DEFAULT NULL');
  await ensureCol('Proveedores', 'responsable', 'VARCHAR(150) DEFAULT NULL');
  await ensureCol('Proveedores', 'direccion', 'VARCHAR(255) DEFAULT NULL');
  await ensureCol('Proveedores', 'telefono', 'VARCHAR(50) DEFAULT NULL');
  await ensureCol('Proveedores', 'zona', 'VARCHAR(100) DEFAULT "Principal"');
  await ensureCol('Proveedores', 'fecha_creacion', 'VARCHAR(50) DEFAULT NULL');
  await ensureCol('Proveedores', 'eliminado', 'TINYINT(1) DEFAULT 0');
  await ensureCol('Proveedores', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

  // 3. Asegurar columnas de Clientes
  await ensureCol('Clientes', 'cuenta_id', 'INT DEFAULT 1');
  await ensureCol('Clientes', 'uuid', 'VARCHAR(36) DEFAULT NULL');
  await ensureCol('Clientes', 'responsable', 'VARCHAR(150) DEFAULT NULL');
  await ensureCol('Clientes', 'direccion', 'VARCHAR(255) DEFAULT NULL');
  await ensureCol('Clientes', 'telefono', 'VARCHAR(50) DEFAULT NULL');
  await ensureCol('Clientes', 'zona', 'VARCHAR(100) DEFAULT "Principal"');
  await ensureCol('Clientes', 'fecha_creacion', 'VARCHAR(50) DEFAULT NULL');
  await ensureCol('Clientes', 'eliminado', 'TINYINT(1) DEFAULT 0');
  await ensureCol('Clientes', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

  // 4. Asegurar columnas de Compras
  await ensureCol('Compras', 'cuenta_id', 'INT DEFAULT 1');
  await ensureCol('Compras', 'uuid', 'VARCHAR(36) DEFAULT NULL');
  await ensureCol('Compras', 'proveedor', 'VARCHAR(150) DEFAULT NULL');
  await ensureCol('Compras', 'Proveedor', 'VARCHAR(150) DEFAULT NULL');
  await ensureCol('Compras', 'proveedor_uuid', 'VARCHAR(36) DEFAULT NULL');
  await ensureCol('Compras', 'fecha', 'VARCHAR(50) DEFAULT NULL');
  await ensureCol('Compras', 'Fecha', 'VARCHAR(50) DEFAULT NULL');
  await ensureCol('Compras', 'total', 'DECIMAL(12,2) DEFAULT 0.00');
  await ensureCol('Compras', 'Total', 'DECIMAL(12,2) DEFAULT 0.00');
  await ensureCol('Compras', 'inicial', 'DECIMAL(12,2) DEFAULT 0.00');
  await ensureCol('Compras', 'Inicial', 'DECIMAL(12,2) DEFAULT 0.00');
  await ensureCol('Compras', 'eliminado', 'TINYINT(1) DEFAULT 0');
  await ensureCol('Compras', 'Eliminado', 'TINYINT(1) DEFAULT 0');

  // 5. Asegurar tabla Cuenta
  try {
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
    reports.push('Cuenta: tabla verificada');
  } catch (e) {
    reports.push(`Cuenta error: ${e.message}`);
  }

  // 5. Si la tabla Cuenta está vacía, insertar cuenta Administrador inicial
  try {
    const [existing] = await pool.query('SELECT COUNT(*) as count FROM `Cuenta`');
    if (existing[0]?.count === 0) {
      const defaultHash = '$2b$10$oI49RGjSF5uTWm/U1vB0UOVnXMC.tIhs6I3HYAJRavov1iku1AbNm';
      await pool.query(`
        INSERT INTO \`Cuenta\` (id, IDCuenta, uuid, Nombre, email, Clave, password_hash, Moneda, Tipo, Fecha)
        VALUES (1, 1, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Administrador', 'admin@optimus360.com', 'admin123', ?, 'USD', 'Administrador', CURDATE())
        ON DUPLICATE KEY UPDATE id=id
      `, [defaultHash]);
      reports.push('Cuenta admin inicial creada');
    }
  } catch (e) {
    reports.push(`Admin insert error: ${e.message}`);
  }

  return reports;
}
