import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/db.js';

export async function getClientes(req, res, next) {
  try {
    const cuentaId = req.user.id;
    const { search = '', page = 1, limit = 50 } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    let query = `
      SELECT id, uuid, nombre, responsable, direccion, telefono, zona, fecha_creacion, updated_at
      FROM Clientes
      WHERE cuenta_id = ? AND eliminado = 0
    `;
    const params = [cuentaId];

    if (search) {
      query += ` AND (nombre LIKE ? OR telefono LIKE ? OR responsable LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY nombre ASC LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    let rows;
    try {
      [rows] = await pool.query(query, params);
    } catch (errQuery) {
      if (errQuery.code === 'ER_BAD_FIELD_ERROR' || String(errQuery.message).includes('fecha_creacion')) {
        try {
          await pool.query('ALTER TABLE `Clientes` ADD COLUMN `fecha_creacion` VARCHAR(50) DEFAULT NULL');
        } catch (e) {}
        const fallbackQuery = query.replace('fecha_creacion, ', '');
        [rows] = await pool.query(fallbackQuery, params);
      } else {
        throw errQuery;
      }
    }

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

export async function createCliente(req, res, next) {
  try {
    const cuentaId = req.user.id;
    const cliUuid = uuidv4();
    const data = req.body;

    // Asignar fecha y hora actual automáticamente
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const autoNow = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const fechaCreacion = data.fecha_creacion || autoNow;

    try {
      const [result] = await pool.query(
        `INSERT INTO Clientes (cuenta_id, uuid, nombre, responsable, direccion, telefono, zona, fecha_creacion, eliminado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [cuentaId, cliUuid, data.nombre, data.responsable || '', data.direccion || '', data.telefono || '', data.zona || '', fechaCreacion]
      );

      return res.status(201).json({
        success: true,
        message: 'Cliente creado exitosamente',
        id: result.insertId,
        uuid: cliUuid
      });
    } catch (errQuery) {
      if (errQuery.code === 'ER_BAD_FIELD_ERROR' || String(errQuery.message).includes('fecha_creacion')) {
        try {
          await pool.query('ALTER TABLE `Clientes` ADD COLUMN `fecha_creacion` VARCHAR(50) DEFAULT NULL');
          const [res2] = await pool.query(
            `INSERT INTO Clientes (cuenta_id, uuid, nombre, responsable, direccion, telefono, zona, fecha_creacion, eliminado)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [cuentaId, cliUuid, data.nombre, data.responsable || '', data.direccion || '', data.telefono || '', data.zona || '', fechaCreacion]
          );
          return res.status(201).json({
            success: true,
            message: 'Cliente creado exitosamente',
            id: res2.insertId,
            uuid: cliUuid
          });
        } catch (e2) {
          const [res3] = await pool.query(
            `INSERT INTO Clientes (cuenta_id, uuid, nombre, responsable, direccion, telefono, zona, eliminado)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
            [cuentaId, cliUuid, data.nombre, data.responsable || '', data.direccion || '', data.telefono || '', data.zona || '']
          );
          return res.status(201).json({
            success: true,
            message: 'Cliente creado exitosamente',
            id: res3.insertId,
            uuid: cliUuid
          });
        }
      }
      throw errQuery;
    }
  } catch (error) {
    next(error);
  }
}

export async function updateCliente(req, res, next) {
  try {
    const cuentaId = req.user.id;
    const { uuid } = req.params;
    const data = req.body;

    const [result] = await pool.query(
      `UPDATE Clientes SET
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
        message: 'Cliente no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Cliente actualizado exitosamente'
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteCliente(req, res, next) {
  try {
    const cuentaId = req.user.id;
    const { uuid } = req.params;

    const [result] = await pool.query(
      'UPDATE Clientes SET eliminado = 1 WHERE uuid = ? AND cuenta_id = ?',
      [uuid, cuentaId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Cliente marcado como eliminado'
    });
  } catch (error) {
    next(error);
  }
}
