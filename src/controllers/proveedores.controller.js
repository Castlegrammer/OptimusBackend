import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/db.js';

export async function getProveedores(req, res, next) {
  try {
    const cuentaId = req.user.id;
    const { search = '', page = 1, limit = 50 } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    let query = `
      SELECT id, uuid, nombre, responsable, direccion, telefono, zona, fecha_creacion, updated_at
      FROM Proveedores
      WHERE cuenta_id = ? AND eliminado = 0
    `;
    const params = [cuentaId];

    if (search) {
      query += ` AND (nombre LIKE ? OR telefono LIKE ? OR responsable LIKE ? OR direccion LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY nombre ASC LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    const [rows] = await pool.query(query, params);

    res.json({
      success: true,
      data: rows,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
    next(error);
  }
}

export async function createProveedor(req, res, next) {
  try {
    const cuentaId = req.user.id;
    const provUuid = uuidv4();
    const data = req.body;
    const today = new Date().toISOString().split('T')[0];

    const [result] = await pool.query(
      `INSERT INTO Proveedores (cuenta_id, uuid, nombre, responsable, direccion, telefono, zona, fecha_creacion, eliminado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [cuentaId, provUuid, data.nombre, data.responsable || '', data.direccion || '', data.telefono || '', data.zona || '', today]
    );

    res.status(201).json({
      success: true,
      message: 'Proveedor creado exitosamente',
      id: result.insertId,
      uuid: provUuid
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProveedor(req, res, next) {
  try {
    const cuentaId = req.user.id;
    const { uuid } = req.params;
    const data = req.body;

    const [result] = await pool.query(
      `UPDATE Proveedores SET
         nombre = COALESCE(?, nombre),
         responsable = COALESCE(?, responsable),
         direccion = COALESCE(?, direccion),
         telefono = COALESCE(?, telefono),
         zona = COALESCE(?, zona)
       WHERE uuid = ? AND cuenta_id = ?`,
      [data.nombre, data.responsable, data.direccion, data.telefono, data.zona, uuid, cuentaId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Proveedor actualizado exitosamente'
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteProveedor(req, res, next) {
  try {
    const cuentaId = req.user.id;
    const { uuid } = req.params;

    const [result] = await pool.query(
      'UPDATE Proveedores SET eliminado = 1 WHERE uuid = ? AND cuenta_id = ?',
      [uuid, cuentaId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Proveedor eliminado exitosamente'
    });
  } catch (error) {
    next(error);
  }
}
