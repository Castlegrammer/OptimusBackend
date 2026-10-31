import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/db.js';

export async function getProductos(req, res, next) {
  try {
    const cuentaId = req.user?.id || 1;
    const { search = '', categoria = '' } = req.query;

    let query = 'SELECT * FROM Productos WHERE (cuenta_id = ? OR (cuenta_id IS NULL AND ? = 1)) AND (eliminado = 0 OR eliminado IS NULL)';
    const params = [cuentaId, cuentaId];

    if (search) {
      query += ' AND (LOWER(nombre) LIKE ? OR LOWER(descripcion) LIKE ? OR LOWER(marca) LIKE ?)';
      const term = `%${search.toLowerCase()}%`;
      params.push(term, term, term);
    }

    if (categoria && categoria !== 'Todas') {
      query += ' AND LOWER(categoria) = LOWER(?)';
      params.push(categoria);
    }

    query += ' ORDER BY 1 DESC LIMIT 300';

    const [rows] = await pool.query(query, params);

    res.json({
      success: true,
      data: rows,
      total: rows.length
    });
  } catch (error) {
    next(error);
  }
}

export async function getProductoByUuid(req, res, next) {
  try {
    const cuentaId = req.user?.id || 1;
    const { uuid } = req.params;

    const [rows] = await pool.query(
      'SELECT * FROM Productos WHERE (uuid = ? OR id = ? OR IDProducto = ?) AND (cuenta_id = ? OR cuenta_id IS NULL) LIMIT 1',
      [uuid, uuid, uuid, cuentaId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
}

export async function createProducto(req, res, next) {
  try {
    const cuentaId = req.user?.id || 1;
    const prodUuid = uuidv4();
    const data = req.body;

    const [result] = await pool.query(
      `INSERT INTO Productos (
        cuenta_id, uuid, nombre, descripcion, categoria, categoria_uuid,
        proveedor, proveedor_uuid, marca, tamano, color, cantidad,
        costo, precio, unidad, maximo, minimo, fecha_vencimiento, foto, eliminado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        cuentaId, prodUuid, data.nombre, data.descripcion || '', data.categoria || '', data.categoria_uuid || null,
        data.proveedor || '', data.proveedor_uuid || null, data.marca || '', data.tamano || '', data.color || '',
        data.cantidad || 0, data.costo || 0, data.precio || 0, data.unidad || 'Unidad', data.maximo || 0,
        data.minimo || 0, data.fecha_vencimiento || '', data.foto || null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente',
      id: result.insertId,
      uuid: prodUuid
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProducto(req, res, next) {
  try {
    const cuentaId = req.user?.id || 1;
    const { uuid } = req.params;
    const data = req.body;

    const [result] = await pool.query(
      `UPDATE Productos SET
        nombre = COALESCE(?, nombre),
        descripcion = COALESCE(?, descripcion),
        categoria = COALESCE(?, categoria),
        categoria_uuid = COALESCE(?, categoria_uuid),
        proveedor = COALESCE(?, proveedor),
        proveedor_uuid = COALESCE(?, proveedor_uuid),
        marca = COALESCE(?, marca),
        tamano = COALESCE(?, tamano),
        color = COALESCE(?, color),
        cantidad = COALESCE(?, cantidad),
        costo = COALESCE(?, costo),
        precio = COALESCE(?, precio),
        unidad = COALESCE(?, unidad),
        maximo = COALESCE(?, maximo),
        minimo = COALESCE(?, minimo),
        fecha_vencimiento = COALESCE(?, fecha_vencimiento),
        foto = COALESCE(?, foto)
       WHERE (uuid = ? OR id = ? OR IDProducto = ?) AND (cuenta_id = ? OR cuenta_id IS NULL)`,
      [
        data.nombre, data.descripcion, data.categoria, data.categoria_uuid,
        data.proveedor, data.proveedor_uuid, data.marca, data.tamano, data.color,
        data.cantidad, data.costo, data.precio, data.unidad, data.maximo,
        data.minimo, data.fecha_vencimiento, data.foto, uuid, uuid, uuid, cuentaId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Producto actualizado exitosamente'
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteProducto(req, res, next) {
  try {
    const cuentaId = req.user?.id || 1;
    const { uuid } = req.params;

    // Soft delete para permitir sincronización
    const [result] = await pool.query(
      'UPDATE Productos SET eliminado = 1 WHERE (uuid = ? OR id = ? OR IDProducto = ?) AND (cuenta_id = ? OR cuenta_id IS NULL)',
      [uuid, uuid, uuid, cuentaId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Producto marcado como eliminado exitosamente'
    });
  } catch (error) {
    next(error);
  }
}
