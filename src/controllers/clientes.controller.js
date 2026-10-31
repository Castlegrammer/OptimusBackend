import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/db.js';

export async function getClientes(req, res, next) {
  try {
    const cuentaId = req.user?.id || 1;
    const { search = '' } = req.query;

    let rows = [];
    try {
      // Usar ORDER BY 1 DESC (la columna primaria es IDCliente)
      const [all] = await pool.query(`SELECT * FROM Clientes ORDER BY 1 DESC LIMIT 200`);
      rows = all;
    } catch (err) {
      console.error('Error SELECT * FROM Clientes:', err.message);
      return res.json({ success: true, data: [] });
    }

    // Filtrar por cuenta_id del usuario y que no estén eliminados
    let filtered = rows.filter(r => {
      const rowCuentaId = r.cuenta_id ?? r.IDCuenta ?? r.id_cuenta;
      const belongsToUser = (rowCuentaId == cuentaId) || (cuentaId == 1 && (rowCuentaId == null || rowCuentaId == 0 || rowCuentaId == 1));
      const notDeleted = (r.Eliminado != 1 && r.eliminado != 1);
      return belongsToUser && notDeleted;
    });

    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(r => {
        const name = String(r.Nombre || r.nombre || '').toLowerCase();
        const resp = String(r.Responsable || r.responsable || '').toLowerCase();
        const tel = String(r.Telefono || r.telefono || '').toLowerCase();
        return name.includes(term) || resp.includes(term) || tel.includes(term);
      });
    }

    const data = filtered.map(r => ({
      id: r.IDCliente || r.ID || r.id || r.Id,
      uuid: r.uuid || r.UUID || `CLI-${r.IDCliente || r.id}`,
      nombre: r.Nombre || r.nombre || '',
      responsable: r.Responsable || r.responsable || '',
      direccion: r.Direccion || r.direccion || '',
      telefono: r.Telefono || r.telefono || '',
      zona: r.Zona || r.zona || 'Principal',
      fecha_creacion: r.fecha_creacion || r.FechaCreacion || r.Fecha || r.created_at || '',
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
    const cuentaId = req.user?.id || 1;
    const cliUuid = uuidv4();
    const data = req.body;

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const autoNow = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const fechaCreacion = data.fecha_creacion || autoNow;

    try {
      const [result] = await pool.query(
        `INSERT INTO Clientes (cuenta_id, uuid, Nombre, Responsable, Direccion, Telefono, Zona, fecha_creacion, Eliminado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [cuentaId, cliUuid, data.nombre, data.responsable || '', data.direccion || '', data.telefono || '', data.zona || '', fechaCreacion]
      );

      return res.status(201).json({
        success: true,
        message: 'Cliente creado exitosamente',
        id: result.insertId,
        uuid: cliUuid,
        nombre: data.nombre,
        responsable: data.responsable || '',
        direccion: data.direccion || '',
        telefono: data.telefono || '',
        zona: data.zona || 'Principal',
        fecha_creacion: fechaCreacion
      });
    } catch (errQuery) {
      try {
        const [result2] = await pool.query(
          `INSERT INTO Clientes (cuenta_id, uuid, nombre, responsable, direccion, telefono, zona, fecha_creacion, eliminado)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
          [cuentaId, cliUuid, data.nombre, data.responsable || '', data.direccion || '', data.telefono || '', data.zona || '', fechaCreacion]
        );
        return res.status(201).json({
          success: true,
          message: 'Cliente creado exitosamente',
          id: result2.insertId,
          uuid: cliUuid,
          nombre: data.nombre,
          responsable: data.responsable || '',
          direccion: data.direccion || '',
          telefono: data.telefono || '',
          zona: data.zona || 'Principal',
          fecha_creacion: fechaCreacion
        });
      } catch (e2) {
        throw errQuery;
      }
    }
  } catch (error) {
    next(error);
  }
}

export async function updateCliente(req, res, next) {
  try {
    const cuentaId = req.user?.id || 1;
    const { uuid } = req.params;
    const data = req.body;

    try {
      await pool.query(
        `UPDATE Clientes SET
           Nombre = COALESCE(?, Nombre),
           Responsable = COALESCE(?, Responsable),
           Direccion = COALESCE(?, Direccion),
           Telefono = COALESCE(?, Telefono),
           Zona = COALESCE(?, Zona)
         WHERE (uuid = ? OR IDCliente = ?) AND (cuenta_id = ? OR cuenta_id IS NULL)`,
        [data.nombre, data.responsable, data.direccion, data.telefono, data.zona, uuid, uuid, cuentaId]
      );
    } catch (e) {
      await pool.query(
        `UPDATE Clientes SET
           nombre = COALESCE(?, nombre),
           responsable = COALESCE(?, responsable),
           direccion = COALESCE(?, direccion),
           telefono = COALESCE(?, telefono),
           zona = COALESCE(?, zona)
         WHERE uuid = ? OR id = ?`,
        [data.nombre, data.responsable, data.direccion, data.telefono, data.zona, uuid, uuid]
      );
    }

    res.json({ success: true, message: 'Cliente actualizado exitosamente' });
  } catch (error) {
    next(error);
  }
}

export async function deleteCliente(req, res, next) {
  try {
    const cuentaId = req.user?.id || 1;
    const { uuid } = req.params;

    try {
      await pool.query(
        'UPDATE Clientes SET Eliminado = 1, eliminado = 1 WHERE (uuid = ? OR IDCliente = ?) AND (cuenta_id = ? OR cuenta_id IS NULL)',
        [uuid, uuid, cuentaId]
      );
    } catch (e) {
      await pool.query('DELETE FROM Clientes WHERE uuid = ? OR IDCliente = ?', [uuid, uuid]);
    }

    res.json({ success: true, message: 'Cliente eliminado exitosamente' });
  } catch (error) {
    next(error);
  }
}
