import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/db.js';

export async function getCategorias(req, res, next) {
  try {
    const cuentaId = req.user?.id || 1;

    let rows = [];
    try {
      // Filtrar estrictamente por la cuenta del usuario autenticado
      const [userCats] = await pool.query(
        `SELECT * FROM Categorias 
         WHERE (cuenta_id = ? OR (cuenta_id IS NULL AND ? = 1)) 
           AND (eliminado = 0 OR eliminado IS NULL) 
         ORDER BY nombre ASC`,
        [cuentaId, cuentaId]
      );
      rows = userCats;
    } catch (errQuery) {
      if (errQuery.code === 'ER_BAD_FIELD_ERROR' || String(errQuery.message).includes('cuenta_id')) {
        try {
          await pool.query('ALTER TABLE `Categorias` ADD COLUMN `cuenta_id` INT DEFAULT 1');
          await pool.query('ALTER TABLE `Categorias` ADD COLUMN `eliminado` TINYINT(1) DEFAULT 0');
          await pool.query('ALTER TABLE `Categorias` ADD COLUMN `uuid` VARCHAR(36) DEFAULT NULL');
          const [retryCats] = await pool.query(
            `SELECT * FROM Categorias WHERE (cuenta_id = ? OR cuenta_id IS NULL) AND (eliminado = 0 OR eliminado IS NULL) ORDER BY nombre ASC`,
            [cuentaId]
          );
          rows = retryCats;
        } catch (e2) {
          const [fallback] = await pool.query(`SELECT * FROM Categorias ORDER BY nombre ASC`);
          rows = fallback;
        }
      } else {
        throw errQuery;
      }
    }

    // Contar productos de forma segura por usuario
    let productCounts = {};
    try {
      const [counts] = await pool.query(
        `SELECT categoria, COUNT(*) as total 
         FROM Productos 
         WHERE (cuenta_id = ? OR cuenta_id IS NULL) AND (eliminado = 0 OR eliminado IS NULL) 
         GROUP BY categoria`,
        [cuentaId]
      );
      for (const item of counts) {
        if (item.categoria) productCounts[item.categoria] = item.total;
      }
    } catch (e) {}

    const data = (rows || []).map(c => ({
      id: c.id || c.ID,
      uuid: c.uuid || c.UUID || `cat-${c.id}`,
      nombre: c.nombre || c.Nombre || '',
      cuenta_id: c.cuenta_id || cuentaId,
      total_productos: productCounts[c.nombre || c.Nombre] || 0,
      updated_at: c.updated_at || ''
    }));

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

export async function createCategoria(req, res, next) {
  try {
    const cuentaId = req.user?.id || 1;
    const { nombre } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ success: false, message: 'El nombre de la categoría es obligatorio.' });
    }

    const catUuid = uuidv4();
    const cleanNombre = nombre.trim();

    try {
      const [result] = await pool.query(
        `INSERT INTO Categorias (cuenta_id, uuid, nombre, eliminado) VALUES (?, ?, ?, 0)`,
        [cuentaId, catUuid, cleanNombre]
      );

      return res.status(201).json({
        success: true,
        message: 'Categoría creada con éxito',
        id: result.insertId,
        uuid: catUuid,
        nombre: cleanNombre,
        cuenta_id: cuentaId,
        total_productos: 0
      });
    } catch (errQuery) {
      if (errQuery.code === 'ER_BAD_FIELD_ERROR') {
        try {
          await pool.query('ALTER TABLE `Categorias` ADD COLUMN `cuenta_id` INT DEFAULT 1');
          await pool.query('ALTER TABLE `Categorias` ADD COLUMN `uuid` VARCHAR(36) DEFAULT NULL');
          await pool.query('ALTER TABLE `Categorias` ADD COLUMN `eliminado` TINYINT(1) DEFAULT 0');
          const [res2] = await pool.query(
            `INSERT INTO Categorias (cuenta_id, uuid, nombre, eliminado) VALUES (?, ?, ?, 0)`,
            [cuentaId, catUuid, cleanNombre]
          );
          return res.status(201).json({
            success: true,
            message: 'Categoría creada con éxito',
            id: res2.insertId,
            uuid: catUuid,
            nombre: cleanNombre,
            cuenta_id: cuentaId,
            total_productos: 0
          });
        } catch (e2) {}
      }
      throw errQuery;
    }
  } catch (error) {
    next(error);
  }
}

export async function updateCategoria(req, res, next) {
  try {
    const cuentaId = req.user?.id || 1;
    const { uuid } = req.params;
    const { nombre } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ success: false, message: 'El nombre de la categoría es requerido.' });
    }

    const cleanNombre = nombre.trim();

    // 1. Obtener nombre anterior
    let oldName = null;
    try {
      const [old] = await pool.query(
        'SELECT nombre, Nombre FROM Categorias WHERE (uuid = ? OR id = ?) AND (cuenta_id = ? OR cuenta_id IS NULL) LIMIT 1',
        [uuid, uuid, cuentaId]
      );
      if (old.length > 0) {
        oldName = old[0].nombre || old[0].Nombre;
      }
    } catch (e) {}

    // 2. Actualizar Categoria
    try {
      await pool.query(
        'UPDATE Categorias SET nombre = ?, Nombre = ? WHERE (uuid = ? OR id = ?) AND (cuenta_id = ? OR cuenta_id IS NULL)',
        [cleanNombre, cleanNombre, uuid, uuid, cuentaId]
      );
    } catch (e1) {
      await pool.query(
        'UPDATE Categorias SET nombre = ? WHERE (uuid = ? OR id = ?)',
        [cleanNombre, uuid, uuid]
      );
    }

    // 3. Propagar cambio a Productos si cambió de nombre
    if (oldName && oldName !== cleanNombre) {
      try {
        await pool.query(
          'UPDATE Productos SET categoria = ? WHERE (categoria = ? OR categoria_uuid = ?) AND (cuenta_id = ? OR cuenta_id IS NULL)',
          [cleanNombre, oldName, uuid, cuentaId]
        );
      } catch (eProd) {}
    }

    res.json({
      success: true,
      message: 'Categoría actualizada exitosamente',
      uuid,
      nombre: cleanNombre
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteCategoria(req, res, next) {
  try {
    const cuentaId = req.user?.id || 1;
    const { uuid } = req.params;

    try {
      await pool.query(
        'UPDATE Categorias SET eliminado = 1 WHERE (uuid = ? OR id = ?) AND (cuenta_id = ? OR cuenta_id IS NULL)',
        [uuid, uuid, cuentaId]
      );
    } catch (e) {
      await pool.query('DELETE FROM Categorias WHERE uuid = ? OR id = ?', [uuid, uuid]);
    }

    res.json({ success: true, message: 'Categoría eliminada' });
  } catch (error) {
    next(error);
  }
}
