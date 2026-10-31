import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/db.js';

export async function getCompras(req, res, next) {
  try {
    const cuentaId = req.user?.id || 1;
    const { search = '' } = req.query;

    let rows = [];
    try {
      const [all] = await pool.query('SELECT * FROM Compras ORDER BY 1 DESC LIMIT 200');
      rows = all;
    } catch (err) {
      console.error('Error SELECT * FROM Compras:', err.message);
      return res.json({ success: true, data: [] });
    }

    // Filtrar por cuenta del usuario y no eliminadas
    let filtered = rows.filter(r => {
      const rowCuentaId = r.cuenta_id ?? r.IDCuenta ?? r.id_cuenta;
      const belongsToUser = (rowCuentaId == cuentaId) || (cuentaId == 1 && (rowCuentaId == null || rowCuentaId == 0 || rowCuentaId == 1));
      const notDeleted = (r.Eliminado != 1 && r.eliminado != 1);
      return belongsToUser && notDeleted;
    });

    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(r => {
        const prov = String(r.Proveedor || r.proveedor || '').toLowerCase();
        const id = String(r.IDCompra || r.id || r.uuid || '').toLowerCase();
        return prov.includes(term) || id.includes(term);
      });
    }

    const data = filtered.map(r => {
      const totalNum = Number(r.Total ?? r.total ?? r.monto ?? r.Monto ?? 0);
      const inicialNum = Number(r.Inicial ?? r.inicial ?? totalNum);

      return {
        id: r.IDCompra || r.id || r.ID || r.Id,
        uuid: r.uuid || r.UUID || `COM-${r.IDCompra || r.id || Date.now()}`,
        proveedor: r.Proveedor || r.proveedor || 'Proveedor Directo',
        proveedor_uuid: r.proveedor_uuid || r.ProveedorUUID || null,
        fecha: r.Fecha || r.fecha || r.created_at || '',
        total: isNaN(totalNum) ? 0 : totalNum,
        inicial: isNaN(inicialNum) ? 0 : inicialNum,
        eliminado: (r.Eliminado == 1 || r.eliminado == 1) ? 1 : 0,
        created_at: r.created_at || r.Fecha || ''
      };
    });

    res.json({
      success: true,
      data,
      total: data.length
    });
  } catch (error) {
    next(error);
  }
}

export async function createCompra(req, res, next) {
  try {
    const cuentaId = req.user?.id || 1;
    const compraUuid = uuidv4();
    const data = req.body;

    const total = parseFloat(data.total) || 0;
    const inicial = parseFloat(data.inicial !== undefined ? data.inicial : data.total) || 0;
    const proveedor = String(data.proveedor || 'Proveedor Directo').trim();
    const proveedorUuid = data.proveedor_uuid || null;
    const fecha = data.fecha || new Date().toISOString().split('T')[0];

    // Intentar inserción tolerante
    try {
      const [result] = await pool.query(
        `INSERT INTO Compras (cuenta_id, uuid, Proveedor, proveedor_uuid, Fecha, Total, Inicial, Eliminado)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [cuentaId, compraUuid, proveedor, proveedorUuid, fecha, total, inicial]
      );

      return res.status(201).json({
        success: true,
        message: 'Compra registrada exitosamente',
        id: result.insertId,
        uuid: compraUuid,
        proveedor,
        fecha,
        total,
        inicial
      });
    } catch (errQuery) {
      try {
        const [result2] = await pool.query(
          `INSERT INTO Compras (cuenta_id, uuid, proveedor, proveedor_uuid, fecha, total, inicial, eliminado)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
          [cuentaId, compraUuid, proveedor, proveedorUuid, fecha, total, inicial]
        );

        return res.status(201).json({
          success: true,
          message: 'Compra registrada exitosamente',
          id: result2.insertId,
          uuid: compraUuid,
          proveedor,
          fecha,
          total,
          inicial
        });
      } catch (err2) {
        // Fallback básico
        const [result3] = await pool.query(
          `INSERT INTO Compras (cuenta_id, uuid, proveedor, fecha, total, inicial)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [cuentaId, compraUuid, proveedor, fecha, total, inicial]
        );

        return res.status(201).json({
          success: true,
          message: 'Compra registrada exitosamente',
          id: result3.insertId,
          uuid: compraUuid,
          proveedor,
          fecha,
          total,
          inicial
        });
      }
    }
  } catch (error) {
    next(error);
  }
}

export async function deleteCompra(req, res, next) {
  try {
    const cuentaId = req.user?.id || 1;
    const { uuid } = req.params;

    try {
      await pool.query(
        'UPDATE Compras SET Eliminado = 1, eliminado = 1 WHERE (uuid = ? OR IDCompra = ? OR id = ?) AND (cuenta_id = ? OR cuenta_id IS NULL)',
        [uuid, uuid, uuid, cuentaId]
      );
    } catch (e) {
      await pool.query('DELETE FROM Compras WHERE uuid = ? OR IDCompra = ? OR id = ?', [uuid, uuid, uuid]);
    }

    res.json({
      success: true,
      message: 'Compra eliminada exitosamente'
    });
  } catch (error) {
    next(error);
  }
}
