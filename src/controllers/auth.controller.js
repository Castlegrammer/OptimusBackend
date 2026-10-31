import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/db.js';

// Helper para obtener el usuario desde la tabla Cuenta (y fallback Usuario)
async function findUserByEmail(email) {
  const cleanEmail = String(email || '').trim().toLowerCase();

  try {
    const [rows] = await pool.query(
      `SELECT * FROM \`Cuenta\` WHERE LOWER(COALESCE(email, Email, '')) = ? OR LOWER(COALESCE(Nombre, nombre, '')) = ? LIMIT 1`,
      [cleanEmail, cleanEmail]
    );
    if (rows && rows.length > 0) {
      return { user: rows[0], tableName: 'Cuenta' };
    }
  } catch (err) {
    if (err.code !== 'ER_NO_SUCH_TABLE') {
      try {
        const [allRows] = await pool.query(`SELECT * FROM \`Cuenta\` LIMIT 100`);
        const match = allRows.find(r => {
          const rowEmail = String(r.email || r.Email || r.correo || r.Correo || '').trim().toLowerCase();
          const rowName = String(r.Nombre || r.nombre || r.usuario || r.Usuario || '').trim().toLowerCase();
          return rowEmail === cleanEmail || rowName === cleanEmail;
        });
        if (match) return { user: match, tableName: 'Cuenta' };
      } catch (e2) {}
    }
  }

  // Fallback a Usuario si existiera
  try {
    const [rows] = await pool.query(
      `SELECT * FROM \`Usuario\` WHERE LOWER(COALESCE(email, Email, '')) = ? OR LOWER(COALESCE(Nombre, nombre, '')) = ? LIMIT 1`,
      [cleanEmail, cleanEmail]
    );
    if (rows && rows.length > 0) {
      return { user: rows[0], tableName: 'Usuario' };
    }
  } catch (e3) {}

  return { user: null, tableName: 'Cuenta' };
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const { user, tableName } = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas. Usuario no encontrado.'
      });
    }

    // Verificar si está inactivo o eliminado si existen las columnas
    if (user.eliminado === 1 || user.activo === 0) {
      return res.status(403).json({
        success: false,
        message: 'La cuenta se encuentra inactiva o deshabilitada.'
      });
    }

    let isMatch = false;
    let shouldEncrypt = false;

    if (user.password_hash && String(user.password_hash).startsWith('$2')) {
      isMatch = await bcrypt.compare(password, user.password_hash);
    } else {
      const rawClave = String(user.Clave || user.clave || user.password_hash || '');
      if (rawClave.startsWith('$2')) {
        isMatch = await bcrypt.compare(password, rawClave);
      } else {
        isMatch = (rawClave === password);
        if (isMatch) {
          shouldEncrypt = true;
        }
      }
    }

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas. Contraseña incorrecta.'
      });
    }

    const userId = user.id || user.IDCuenta || user.IDUsuario || user.Id || 1;
    const userUuid = user.uuid || user.UUID || uuidv4();
    const userName = user.Nombre || user.nombre || 'Administrador';
    const userEmail = user.email || user.Email || email;
    const userMoneda = user.Moneda || user.moneda || 'USD';
    const userTipo = user.Tipo || user.tipo || 'Administrador';
    const userFecha = user.Fecha || user.fecha || '';

    // Si la contraseña no estaba encriptada en la BD, la encriptamos de inmediato
    if (shouldEncrypt) {
      try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        try {
          await pool.query(`UPDATE ${tableName} SET password_hash = ? WHERE id = ?`, [hash, userId]);
        } catch (e1) {}
        try {
          await pool.query(`UPDATE ${tableName} SET Clave = ? WHERE id = ?`, [hash, userId]);
        } catch (e2) {}
      } catch (errEnc) {
        console.error("Error auto-encriptando clave:", errEnc);
      }
    }

    const token = jwt.sign(
      {
        id: userId,
        uuid: userUuid,
        email: userEmail,
        nombre: userName,
        tipo: userTipo,
        moneda: userMoneda
      },
      process.env.JWT_SECRET || 'super_secret_optimus360_jwt_key_2026_xyz987',
      { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
    );

    res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      token,
      user: {
        id: userId,
        uuid: userUuid,
        nombre: userName,
        email: userEmail,
        moneda: userMoneda,
        tipo: userTipo,
        fecha: userFecha
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function register(req, res, next) {
  try {
    const { nombre, email, password, moneda = 'USD', tipo = 'Administrador' } = req.body;

    const { user } = await findUserByEmail(email);

    if (user) {
      return res.status(409).json({
        success: false,
        message: 'El correo electrónico ya se encuentra registrado.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userUuid = uuidv4();
    const today = new Date().toISOString().split('T')[0];

    let targetTable = 'Cuenta';
    try {
      await pool.query('SELECT 1 FROM Cuenta LIMIT 1');
    } catch (e) {
      targetTable = 'Usuario';
    }

    const [result] = await pool.query(
      `INSERT INTO ${targetTable} (uuid, Nombre, email, Clave, password_hash, Moneda, Tipo, Fecha, activo, eliminado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0)`,
      [userUuid, nombre, email, password, passwordHash, moneda, tipo, today]
    );

    const userId = result.insertId || 1;

    const token = jwt.sign(
      {
        id: userId,
        uuid: userUuid,
        email,
        nombre,
        tipo,
        moneda
      },
      process.env.JWT_SECRET || 'super_secret_optimus360_jwt_key_2026_xyz987',
      { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
    );

    res.status(201).json({
      success: true,
      message: 'Cuenta registrada exitosamente',
      token,
      user: {
        id: userId,
        uuid: userUuid,
        nombre,
        email,
        moneda,
        tipo
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getProfile(req, res, next) {
  try {
    const { user } = await findUserByEmail(req.user.email);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id || user.IDCuenta || user.IDUsuario || req.user.id,
        uuid: user.uuid || req.user.uuid,
        nombre: user.Nombre || user.nombre,
        email: user.email || user.Email,
        moneda: user.Moneda || user.moneda,
        tipo: user.Tipo || user.tipo
      }
    });
  } catch (error) {
    next(error);
  }
}
