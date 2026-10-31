import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/db.js';

export async function getCategorias(req, res, next) {
  try {
    const cuentaId = req.user.id;
    const [rows] = await pool.query(
      `SELECT c.id, c.uuid, c.nombre, c.updated_at,
              (SELECT COUNT(*) FROM Productos p WHERE p.cuenta_id = c.cuenta_id AND p.categoria = c.nombre AND p.eliminado = 0) as total_productos
       FROM Categorias c
       WHERE c.cuenta_id = ? AND c.eliminado = 0
       ORDER BY c.nombre ASC`,
      [cuentaId]
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
}

export async function createCategoria(req, res, next) {
  try {
    const cuentaId = req.user.id;
    const { nombre } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ success: false, message: 'El nombre es obligatorio' });
    }

    const catUuid = uuidv4();
    const [result] = await pool.query(
      `INSERT INTO Categorias (cuenta_id, uuid, nombre, eliminado) VALUES (?, ?, ?, 0)`,
      [cuentaId, catUuid, nombre.trim()]
    );

    res.status(201).json({
      success: true,
      message: 'Categoría creada con éxito',
      id: result.insertId,
      uuid: catUuid,
      nombre: nombre.trim()
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteCategoria(req, res, next) {
  try {
    const cuentaId = req.user.id;
    const { uuid } = req.params;

    const [result] = await pool.query(
      'UPDATE Categorias SET eliminado = 1 WHERE uuid = ? AND cuenta_id = ?',
      [uuid, cuentaId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Categoría no encontrada' });
    }

    res.json({ success: true, message: 'Categoría eliminada' });
  } catch (error) {
    next(error);
  }
}
