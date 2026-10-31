import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/db.js';

export async function getClientes(req, res, next) {
  try {
    const { search = '' } = req.query;

    let rows = [];
    try {
      const [all] = await pool.query(`SELECT * FROM Clientes ORDER BY id DESC LIMIT 200`);
      rows = all;
    } catch (err) {
      console.error('Error SELECT * FROM Clientes:', err.message);
      return res.json({ success: true, data: [] });
    }

    // Filtrar eliminados si existe el campo
    let filtered = rows.filter(r => r.eliminado != 1);

    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(r => {
        const name = String(r.nombre || r.Nombre || '').toLowerCase();
        const resp = String(r.responsable || r.Responsable || '').toLowerCase();
        const tel = String(r.telefono || r.Telefono || '').toLowerCase();
        return name.includes(term) || resp.includes(term) || tel.includes(term);
      });
    }

    const data = filtered.map(r => ({
      id: r.id || r.ID || r.Id,
      uuid: r.uuid || r.UUID || `CLI-${r.id}`,
      nombre: r.nombre || r.Nombre || '',
      responsable: r.responsable || r.Responsable || '',
      direccion: r.direccion || r.Direccion || '',
      telefono: r.telefono || r.Telefono || '',
      zona: r.zona || r.Zona || 'Principal',
      fecha_creacion: r.fecha_creacion || r.Fecha_Creacion || r.Fecha || r.created_at || '',
      updated_at: r.updated_at || r.fecha_creacion || ''
    }));

    res.json({
      success: true,
      data,
      total: data.length
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
