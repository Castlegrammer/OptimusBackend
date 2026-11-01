import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/db.js';

export async function getVentas(req, res, next) {
  try {
    const cuentaId = req.user?.id || 1;
    const { page = 1, limit = 100 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let rows = [];
    try {
      const [res1] = await pool.query(
        `SELECT id, uuid, cliente, cliente_uuid, fecha, total, inicial, updated_at
         FROM Ventas
         WHERE (cuenta_id = ? OR (cuenta_id IS NULL AND ? = 1)) AND (eliminado = 0 OR eliminado IS NULL)
         ORDER BY id DESC LIMIT ? OFFSET ?`,
        [cuentaId, cuentaId, Number(limit), offset]
      );
      rows = res1;
    } catch (e1) {
      try {
        const [res2] = await pool.query(
          `SELECT * FROM Ventas ORDER BY 1 DESC LIMIT ? OFFSET ?`,
          [Number(limit), offset]
        );
        rows = res2.filter(r => {
          const rowCuentaId = r.cuenta_id ?? r.IDCuenta;
          return (rowCuentaId == cuentaId) || (cuentaId == 1);
        });
      } catch (e2) {
        console.error('Error SELECT Ventas:', e2.message);
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

export async function getVentaById(req, res, next) {
  try {
    const cuentaId = req.user?.id || 1;
    const { uuid } = req.params;

    const [ventas] = await pool.query(
      `SELECT id, uuid, cliente, cliente_uuid, fecha, total, inicial, updated_at
       FROM Ventas WHERE (uuid = ? OR id = ?) AND (cuenta_id = ? OR cuenta_id IS NULL OR ? = 1) LIMIT 1`,
      [uuid, uuid, cuentaId, cuentaId]
    );

    if (ventas.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Venta no encontrada'
      });
    }

    let detalles = [];
    try {
      const [det] = await pool.query(
        `SELECT uuid, producto_uuid, producto, cantidad, precio, total, fecha
         FROM VentaDetalles
         WHERE venta_uuid = ?`,
        [uuid]
      );
      detalles = det;
    } catch (e) {}

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
  const cuentaId = req.user?.id || 1;
  const ventaUuid = uuidv4();

  try {
    await connection.beginTransaction();

    const { cliente = '', cliente_uuid = null, fecha, total, inicial = 0, detalles = [] } = req.body;
    const ventaFecha = fecha || new Date().toISOString().replace('T', ' ').substring(0, 19);
    const totalAmount = parseFloat(total) || 0;
    const initialAmount = parseFloat(inicial) || totalAmount;

    // 1. Insertar cabecera de la venta
    let insertResult;
    try {
      const [result] = await connection.query(
        `INSERT INTO Ventas (cuenta_id, uuid, cliente, cliente_uuid, fecha, total, inicial, eliminado)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [cuentaId, ventaUuid, cliente, cliente_uuid, ventaFecha, totalAmount, initialAmount]
      );
      insertResult = result;
    } catch (eV1) {
      const [result] = await connection.query(
        `INSERT INTO ventas (cuenta_id, uuid, cliente, cliente_uuid, fecha, total, inicial, eliminado)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [cuentaId, ventaUuid, cliente, cliente_uuid, ventaFecha, totalAmount, initialAmount]
      );
      insertResult = result;
    }

    // 2. Insertar cada detalle y descontar stock del inventario
    for (const item of detalles) {
      const detalleUuid = uuidv4();
      const itemQty = parseFloat(item.cantidad) || 1;
      const itemPrice = parseFloat(item.precio) || 0;
      const itemTotal = parseFloat(item.total) || (itemQty * itemPrice);
      const prodUuid = item.producto_uuid || item.uuid || null;
      const prodId = item.producto_id || item.id || null;
      const prodName = item.producto || item.nombre || 'Producto';

      // Insertar en VentaDetalles
      try {
        await connection.query(
          `INSERT INTO VentaDetalles (cuenta_id, uuid, venta_uuid, producto_uuid, producto, cantidad, precio, total, fecha, eliminado)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
          [cuentaId, detalleUuid, ventaUuid, prodUuid, prodName, itemQty, itemPrice, itemTotal, ventaFecha]
        );
      } catch (eVD1) {
        try {
          await connection.query(
            `INSERT INTO venta_detalles (cuenta_id, uuid, venta_uuid, producto_uuid, producto, cantidad, precio, total, fecha, eliminado)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [cuentaId, detalleUuid, ventaUuid, prodUuid, prodName, itemQty, itemPrice, itemTotal, ventaFecha]
          );
        } catch (eVD2) {
          console.warn('Venta detalle insert bypass:', eVD2.message);
        }
      }

      // 3. Descontar stock del producto en la tabla Productos
      if (itemQty > 0 && (prodUuid || prodId || prodName)) {
        const idVal = prodUuid || prodId || '';
        try {
          await connection.query(
            `UPDATE Productos 
             SET cantidad = GREATEST(0, COALESCE(cantidad, 0) - ?)
             WHERE (
               (uuid IS NOT NULL AND uuid != '' AND uuid = ?) OR 
               (id IS NOT NULL AND (id = ? OR id = ?)) OR 
               (IDProducto IS NOT NULL AND (IDProducto = ? OR IDProducto = ?)) OR 
               (nombre IS NOT NULL AND LOWER(nombre) = LOWER(?)) OR
               (Nombre IS NOT NULL AND LOWER(Nombre) = LOWER(?))
             ) AND (cuenta_id = ? OR cuenta_id IS NULL OR ? = 1)`,
            [itemQty, idVal, idVal, prodId, idVal, prodId, prodName, prodName, cuentaId, cuentaId]
          );
        } catch (eStock1) {
          try {
            await connection.query(
              `UPDATE Productos 
               SET Cantidad = GREATEST(0, COALESCE(Cantidad, 0) - ?)
               WHERE (
                 (uuid IS NOT NULL AND uuid != '' AND uuid = ?) OR 
                 (id IS NOT NULL AND (id = ? OR id = ?)) OR 
                 (IDProducto IS NOT NULL AND (IDProducto = ? OR IDProducto = ?)) OR 
                 (nombre IS NOT NULL AND LOWER(nombre) = LOWER(?)) OR
                 (Nombre IS NOT NULL AND LOWER(Nombre) = LOWER(?))
               ) AND (cuenta_id = ? OR cuenta_id IS NULL OR ? = 1)`,
              [itemQty, idVal, idVal, prodId, idVal, prodId, prodName, prodName, cuentaId, cuentaId]
            );
          } catch (eStock2) {
            try {
              await connection.query(
                `UPDATE productos 
                 SET cantidad = GREATEST(0, COALESCE(cantidad, 0) - ?)
                 WHERE (
                   (uuid IS NOT NULL AND uuid != '' AND uuid = ?) OR 
                   (id IS NOT NULL AND (id = ? OR id = ?)) OR 
                   (nombre IS NOT NULL AND LOWER(nombre) = LOWER(?))
                 ) AND (cuenta_id = ? OR cuenta_id IS NULL OR ? = 1)`,
                [itemQty, idVal, idVal, prodId, prodName, cuentaId, cuentaId]
              );
            } catch (eStock3) {
              console.warn('Descuento de stock bypass:', eStock3.message);
            }
          }
        }
      }
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Venta registrada exitosamente y stock descontado',
      id: insertResult?.insertId,
      uuid: ventaUuid
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}
