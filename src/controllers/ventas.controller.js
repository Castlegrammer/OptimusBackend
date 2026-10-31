import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/db.js';

export async function getVentas(req, res, next) {
  try {
    const cuentaId = req.user.id;
    const { page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const [rows] = await pool.query(
      `SELECT id, uuid, cliente, cliente_uuid, fecha, total, inicial, updated_at
       FROM Ventas
       WHERE cuenta_id = ? AND eliminado = 0
       ORDER BY id DESC LIMIT ? OFFSET ?`,
      [cuentaId, Number(limit), offset]
    );

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

export async function getVentaById(req, res, next) {
  try {
    const cuentaId = req.user.id;
    const { uuid } = req.params;

    const [ventas] = await pool.query(
      `SELECT id, uuid, cliente, cliente_uuid, fecha, total, inicial, updated_at
       FROM Ventas WHERE uuid = ? AND cuenta_id = ? AND eliminado = 0 LIMIT 1`,
      [uuid, cuentaId]
    );

    if (ventas.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Venta no encontrada'
      });
    }

    const [detalles] = await pool.query(
      `SELECT uuid, producto_uuid, producto, cantidad, precio, total, fecha
       FROM VentaDetalles
       WHERE venta_uuid = ? AND cuenta_id = ? AND eliminado = 0`,
      [uuid, cuentaId]
    );

    res.json({
      success: true,
      data: {
        ...ventas[0],
        detalles
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function createVenta(req, res, next) {
  const connection = await pool.getConnection();
  const cuentaId = req.user.id;
  const ventaUuid = uuidv4();

  try {
    await connection.beginTransaction();

    const { cliente = '', cliente_uuid = null, fecha, total, inicial = 0, detalles = [] } = req.body;
    const ventaFecha = fecha || new Date().toISOString().replace('T', ' ').substring(0, 19);

    // 1. Insertar cabecera de la venta
    const [result] = await connection.query(
      `INSERT INTO Ventas (cuenta_id, uuid, cliente, cliente_uuid, fecha, total, inicial, eliminado)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [cuentaId, ventaUuid, cliente, cliente_uuid, ventaFecha, total, inicial]
    );

    // 2. Insertar cada detalle y descontar stock si el producto existe
    for (const item of detalles) {
      const detalleUuid = uuidv4();

      await connection.query(
        `INSERT INTO VentaDetalles (cuenta_id, uuid, venta_uuid, producto_uuid, producto, cantidad, precio, total, fecha, eliminado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [cuentaId, detalleUuid, ventaUuid, item.producto_uuid || null, item.producto, item.cantidad, item.precio, item.total, ventaFecha]
      );

      // Descuento de stock si tiene producto_uuid
      if (item.producto_uuid) {
        await connection.query(
          `UPDATE Productos SET cantidad = cantidad - ?
           WHERE uuid = ? AND cuenta_id = ?`,
          [item.cantidad, item.producto_uuid, cuentaId]
        );
      }
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Venta registrada exitosamente',
      id: result.insertId,
      uuid: ventaUuid
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}
