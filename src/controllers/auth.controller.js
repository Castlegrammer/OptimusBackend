import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/db.js';

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const [rows] = await pool.query(
      'SELECT id, uuid, nombre, email, password_hash, moneda, tipo, activo, eliminado FROM cuentas WHERE email = ? LIMIT 1',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas. Usuario no encontrado.'
      });
    }

    const user = rows[0];

    if (user.eliminado || !user.activo) {
      return res.status(403).json({
        success: false,
        message: 'La cuenta se encuentra inactiva o deshabilitada.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas. Contraseña incorrecta.'
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        uuid: user.uuid,
        email: user.email,
        nombre: user.nombre,
        tipo: user.tipo,
        moneda: user.moneda
      },
      process.env.JWT_SECRET || 'super_secret_optimus360_jwt_key_2026_xyz987',
      { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
    );

    res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      token,
      user: {
        id: user.id,
        uuid: user.uuid,
        nombre: user.nombre,
        email: user.email,
        moneda: user.moneda,
        tipo: user.tipo
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function register(req, res, next) {
  try {
    const { nombre, email, password, moneda = 'USD', tipo = 'Administrador' } = req.body;

    const [existing] = await pool.query(
      'SELECT id FROM cuentas WHERE email = ? LIMIT 1',
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'El correo electrónico ya se encuentra registrado.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userUuid = uuidv4();

    const [result] = await pool.query(
      `INSERT INTO cuentas (uuid, nombre, email, password_hash, moneda, tipo)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userUuid, nombre, email, passwordHash, moneda, tipo]
    );

    const token = jwt.sign(
      {
        id: result.insertId,
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
        id: result.insertId,
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
    const [rows] = await pool.query(
      'SELECT id, uuid, nombre, email, moneda, tipo, created_at, updated_at FROM cuentas WHERE id = ? LIMIT 1',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      user: rows[0]
    });
  } catch (error) {
    next(error);
  }
}
