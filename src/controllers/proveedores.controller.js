import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/db.js';

export async function getProveedores(req, res, next) {
  try {
    const cuentaId = req.user?.id || 1;
    const { search = '' } = req.query;

    let rows = [];
    try {
      // Usar ORDER BY 1 DESC para evitar errores si la clave primaria no se llama 'id'
      const [all] = await pool.query(`SELECT * FROM Proveedores ORDER BY 1 DESC LIMIT 200`);
      rows = all;
    } catch (err) {
      console.error('Error SELECT * FROM Proveedores:', err.message);
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
        const dir = String(r.Direccion || r.direccion || '').toLowerCase();
        return name.includes(term) || resp.includes(term) || tel.includes(term) || dir.includes(term);
      });
    }

    const data = filtered.map(r => ({
      id: r.IDProveedor || r.IDCliente || r.id || r.ID || r.Id,
      uuid: r.uuid || r.UUID || `PROV-${r.IDProveedor || r.IDCliente || r.id || 1}`,
      nombre: r.Nombre || r.nombre || '',
      responsable: r.Responsable || r.responsable || '',
      direccion: r.Direccion || r.direccion || '',
      telefono: r.Telefono || r.telefono || '',
      zona: r.Zona || r.zona || 'Principal',
      fecha_creacion: r.fecha_creacion || r.FechaCreacion || r.Fecha_Creacion || r.Fecha || r.created_at || '',
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

export async function createProveedor(req, res, next) {
  try {
    const cuentaId = req.user?.id || 1;
    const provUuid = uuidv4();
    const data = req.body;
    
    // Asignar fecha y hora actual automáticamente
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const autoNow = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const fechaCreacion = data.fecha_creacion || autoNow;

    try {
      const [result] = await pool.query(
        `INSERT INTO Proveedores (cuenta_id, uuid, Nombre, Responsable, Direccion, Telefono, Zona, fecha_creacion, Eliminado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [cuentaId, provUuid, data.nombre, data.responsable || '', data.direccion || '', data.telefono || '', data.zona || '', fechaCreacion]
      );

      return res.status(201).json({
        success: true,
        message: 'Proveedor registrado exitosamente',
        id: result.insertId,
        uuid: provUuid,
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
          `INSERT INTO Proveedores (cuenta_id, uuid, nombre, responsable, direccion, telefono, zona, fecha_creacion, eliminado)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
          [cuentaId, provUuid, data.nombre, data.responsable || '', data.direccion || '', data.telefono || '', data.zona || '', fechaCreacion]
        );
        return res.status(201).json({
          success: true,
          message: 'Proveedor registrado exitosamente',
          id: result2.insertId,
          uuid: provUuid,
          nombre: data.nombre,
          responsable: data.responsable || '',
          direccion: data.direccion || '',
          telefono: data.telefono || '',
          zona: data.zona || 'Principal',
          fecha_creacion: fechaCreacion
        });
      } catch (e2) {
        // En caso de que no exista la columna fecha_creacion
        try {
          await pool.query('ALTER TABLE `Proveedores` ADD COLUMN `fecha_creacion` VARCHAR(50) DEFAULT NULL');
          const [result3] = await pool.query(
            `INSERT INTO Proveedores (cuenta_id, uuid, nombre, responsable, direccion, telefono, zona, fecha_creacion, eliminado)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [cuentaId, provUuid, data.nombre, data.responsable || '', data.direccion || '', data.telefono || '', data.zona || '', fechaCreacion]
          );
          return res.status(201).json({
            success: true,
            message: 'Proveedor registrado exitosamente',
            id: result3.insertId,
            uuid: provUuid,
            nombre: data.nombre,
            responsable: data.responsable || '',
            direccion: data.direccion || '',
            telefono: data.telefono || '',
            zona: data.zona || 'Principal',
            fecha_creacion: fechaCreacion
          });
        } catch (e3) {
          const [result4] = await pool.query(
            `INSERT INTO Proveedores (cuenta_id, uuid, nombre, responsable, direccion, telefono, zona, eliminado)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
            [cuentaId, provUuid, data.nombre, data.responsable || '', data.direccion || '', data.telefono || '', data.zona || '']
          );
          return res.status(201).json({
            success: true,
            message: 'Proveedor registrado exitosamente',
            id: result4.insertId,
            uuid: provUuid,
            nombre: data.nombre,
            responsable: data.responsable || '',
            direccion: data.direccion || '',
            telefono: data.telefono || '',
            zona: data.zona || 'Principal',
            fecha_creacion: fechaCreacion
          });
        }
      }
    }
  } catch (error) {
    next(error);
  }
}

export async function updateProveedor(req, res, next) {
  try {
    const cuentaId = req.user?.id || 1;
    const { uuid } = req.params;
    const data = req.body;

    try {
      await pool.query(
        `UPDATE Proveedores SET
           Nombre = COALESCE(?, Nombre),
           Responsable = COALESCE(?, Responsable),
           Direccion = COALESCE(?, Direccion),
           Telefono = COALESCE(?, Telefono),
           Zona = COALESCE(?, Zona)
         WHERE (uuid = ? OR IDProveedor = ? OR IDCliente = ?) AND (cuenta_id = ? OR cuenta_id IS NULL)`,
        [data.nombre, data.responsable, data.direccion, data.telefono, data.zona, uuid, uuid, uuid, cuentaId]
      );
    } catch (e) {
      await pool.query(
        `UPDATE Proveedores SET
           nombre = COALESCE(?, nombre),
           responsable = COALESCE(?, responsable),
           direccion = COALESCE(?, direccion),
           telefono = COALESCE(?, telefono),
           zona = COALESCE(?, zona)
         WHERE (uuid = ? OR id = ?) AND (cuenta_id = ? OR cuenta_id IS NULL)`,
        [data.nombre, data.responsable, data.direccion, data.telefono, data.zona, uuid, uuid, cuentaId]
      );
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
    const cuentaId = req.user?.id || 1;
    const { uuid } = req.params;

    try {
      await pool.query(
        'UPDATE Proveedores SET Eliminado = 1, eliminado = 1 WHERE (uuid = ? OR IDProveedor = ? OR IDCliente = ?) AND (cuenta_id = ? OR cuenta_id IS NULL)',
        [uuid, uuid, uuid, cuentaId]
      );
    } catch (e) {
      await pool.query('DELETE FROM Proveedores WHERE uuid = ? OR IDProveedor = ? OR IDCliente = ?', [uuid, uuid, uuid]);
    }

    res.json({
      success: true,
      message: 'Proveedor eliminado exitosamente'
    });
  } catch (error) {
    next(error);
  }
}
