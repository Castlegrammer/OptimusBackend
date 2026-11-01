import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/db.js';

// Cache de columnas de la tabla Productos para rendimiento óptimo
let productosColsCache = null;
let productosTableName = 'Productos';

async function getProductosColumns() {
  if (productosColsCache && productosColsCache.length > 0) {
    return { tableName: productosTableName, columns: productosColsCache };
  }

  for (const table of ['Productos', 'productos', 'PRODUCTOS']) {
    try {
      const [cols] = await pool.query(`SHOW COLUMNS FROM \`${table}\``);
      if (cols && cols.length > 0) {
        productosTableName = table;
        productosColsCache = cols.map(c => c.Field);
        return { tableName: productosTableName, columns: productosColsCache };
      }
    } catch (e) {}
  }

  return { tableName: 'Productos', columns: [] };
}

// Helper para normalizar fila de Producto a formato estándar
function mapProductoRow(r, cuentaId) {
  const idVal = r.id ?? r.IDProducto ?? r.ID ?? r.Id;
  const uuidVal = r.uuid ?? r.UUID ?? `PROD-${idVal}`;
  return {
    id: idVal,
    uuid: uuidVal,
    nombre: r.nombre ?? r.Nombre ?? '',
    descripcion: r.descripcion ?? r.Descripcion ?? '',
    categoria: r.categoria ?? r.Categoria ?? 'General',
    categoria_uuid: r.categoria_uuid ?? r.CategoriaUUID ?? null,
    proveedor: r.proveedor ?? r.Proveedor ?? '',
    proveedor_uuid: r.proveedor_uuid ?? r.ProveedorUUID ?? null,
    marca: r.marca ?? r.Marca ?? '',
    tamano: r.tamano ?? r.Tamano ?? r['tamaño'] ?? '',
    color: r.color ?? r.Color ?? '',
    cantidad: Number(r.cantidad ?? r.Cantidad ?? 0),
    costo: Number(r.costo ?? r.Costo ?? 0),
    precio: Number(r.precio ?? r.Precio ?? 0),
    unidad: r.unidad ?? r.Unidad ?? 'Unidad',
    maximo: Number(r.maximo ?? r.Maximo ?? 0),
    minimo: Number(r.minimo ?? r.Minimo ?? 0),
    fecha_vencimiento: r.fecha_vencimiento ?? r.FechaVencimiento ?? '',
    foto: r.foto ?? r.Foto ?? null,
    cuenta_id: r.cuenta_id ?? r.IDCuenta ?? cuentaId,
    eliminado: (r.eliminado == 1 || r.Eliminado == 1) ? 1 : 0,
    updated_at: r.updated_at ?? r.created_at ?? ''
  };
}

export async function getProductos(req, res, next) {
  try {
    const cuentaId = req.user?.id || 1;
    const { search = '', categoria = '' } = req.query;
    const { tableName } = await getProductosColumns();

    let allRows = [];
    try {
      const [rows] = await pool.query(`SELECT * FROM \`${tableName}\` ORDER BY 1 DESC LIMIT 400`);
      allRows = rows;
    } catch (err) {
      console.error('Error al consultar productos:', err);
      return res.json({ success: true, data: [], total: 0 });
    }

    // Filtrar por cuenta_id y no eliminados
    let filtered = allRows.filter(r => {
      const rowCuentaId = r.cuenta_id ?? r.IDCuenta ?? r.id_cuenta;
      const belongs = (rowCuentaId == cuentaId) || (cuentaId == 1 && (rowCuentaId == null || rowCuentaId == 0 || rowCuentaId == 1));
      const notDeleted = (r.eliminado != 1 && r.Eliminado != 1);
      return belongs && notDeleted;
    });

    if (categoria && categoria !== 'Todas') {
      const targetCat = categoria.toLowerCase();
      filtered = filtered.filter(r => {
        const cat = String(r.categoria ?? r.Categoria ?? '').toLowerCase();
        return cat === targetCat;
      });
    }

    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(r => {
        const nom = String(r.nombre ?? r.Nombre ?? '').toLowerCase();
        const desc = String(r.descripcion ?? r.Descripcion ?? '').toLowerCase();
        const prov = String(r.proveedor ?? r.Proveedor ?? '').toLowerCase();
        const marca = String(r.marca ?? r.Marca ?? '').toLowerCase();
        return nom.includes(term) || desc.includes(term) || prov.includes(term) || marca.includes(term);
      });
    }

    const data = filtered.map(r => mapProductoRow(r, cuentaId));

    res.json({
      success: true,
      data,
      total: data.length
    });
  } catch (error) {
    next(error);
  }
}

export async function getProductoByUuid(req, res, next) {
  try {
    const cuentaId = req.user?.id || 1;
    const { uuid } = req.params;
    const { tableName } = await getProductosColumns();

    const [rows] = await pool.query(`SELECT * FROM \`${tableName}\` LIMIT 400`);
    const found = rows.find(r => {
      const rUuid = String(r.uuid ?? r.UUID ?? '');
      const rId = String(r.id ?? r.IDProducto ?? r.ID ?? '');
      return (rUuid === uuid || rId === uuid);
    });

    if (!found) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    res.json({
      success: true,
      data: mapProductoRow(found, cuentaId)
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
    const { tableName, columns } = await getProductosColumns();

    // Mapeo exhaustivo de campos posibles a insertar
    const candidateFields = {
      cuenta_id: cuentaId,
      idcuenta: cuentaId,
      uuid: prodUuid,
      nombre: data.nombre ? String(data.nombre).trim() : '',
      descripcion: data.descripcion ? String(data.descripcion).trim() : '',
      categoria: data.categoria ? String(data.categoria).trim() : '',
      categoria_uuid: data.categoria_uuid || null,
      proveedor: data.proveedor ? String(data.proveedor).trim() : '',
      proveedor_uuid: data.proveedor_uuid || null,
      marca: data.marca ? String(data.marca).trim() : '',
      tamano: data.tamano || '',
      color: data.color || '',
      cantidad: parseFloat(data.cantidad) || 0,
      costo: parseFloat(data.costo) || 0,
      precio: parseFloat(data.precio) || 0,
      unidad: data.unidad || 'Unidad',
      maximo: parseFloat(data.maximo) || 0,
      minimo: parseFloat(data.minimo) || 0,
      fecha_vencimiento: data.fecha_vencimiento || '',
      foto: data.foto || null,
      eliminado: 0
    };

    const insertCols = [];
    const insertVals = [];
    const placeholders = [];

    if (columns.length > 0) {
      for (const col of columns) {
        const lowerCol = col.toLowerCase();
        // Ignorar claves primarias auto-increment
        if (lowerCol === 'id' || lowerCol === 'idproducto') continue;

        if (lowerCol in candidateFields) {
          insertCols.push(`\`${col}\``);
          insertVals.push(candidateFields[lowerCol]);
          placeholders.push('?');
        }
      }
    }

    // Fallback seguro si no se pudieron inspeccionar columnas
    if (insertCols.length === 0) {
      insertCols.push('`cuenta_id`', '`uuid`', '`nombre`', '`descripcion`', '`categoria`', '`proveedor`', '`costo`', '`precio`', '`cantidad`', '`unidad`', '`eliminado`');
      insertVals.push(cuentaId, prodUuid, data.nombre, data.descripcion || '', data.categoria || '', data.proveedor || '', data.costo || 0, data.precio || 0, data.cantidad || 0, data.unidad || 'Unidad', 0);
      placeholders.push('?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?');
    }

    const sql = `INSERT INTO \`${tableName}\` (${insertCols.join(', ')}) VALUES (${placeholders.join(', ')})`;
    const [result] = await pool.query(sql, insertVals);

    res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente',
      id: result.insertId,
      uuid: prodUuid,
      data: {
        id: result.insertId,
        uuid: prodUuid,
        nombre: data.nombre,
        descripcion: data.descripcion || '',
        categoria: data.categoria || '',
        proveedor: data.proveedor || '',
        costo: parseFloat(data.costo) || 0,
        precio: parseFloat(data.precio) || 0,
        cantidad: parseFloat(data.cantidad) || 0,
        unidad: data.unidad || 'Unidad'
      }
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
    const { tableName, columns } = await getProductosColumns();

    const candidateUpdates = {};
    if (data.nombre !== undefined) candidateUpdates.nombre = String(data.nombre).trim();
    if (data.descripcion !== undefined) candidateUpdates.descripcion = String(data.descripcion).trim();
    if (data.categoria !== undefined) candidateUpdates.categoria = String(data.categoria).trim();
    if (data.categoria_uuid !== undefined) candidateUpdates.categoria_uuid = data.categoria_uuid;
    if (data.proveedor !== undefined) candidateUpdates.proveedor = String(data.proveedor).trim();
    if (data.proveedor_uuid !== undefined) candidateUpdates.proveedor_uuid = data.proveedor_uuid;
    if (data.marca !== undefined) candidateUpdates.marca = String(data.marca).trim();
    if (data.tamano !== undefined) candidateUpdates.tamano = data.tamano;
    if (data.color !== undefined) candidateUpdates.color = data.color;
    if (data.cantidad !== undefined) candidateUpdates.cantidad = parseFloat(data.cantidad) || 0;
    if (data.costo !== undefined) candidateUpdates.costo = parseFloat(data.costo) || 0;
    if (data.precio !== undefined) candidateUpdates.precio = parseFloat(data.precio) || 0;
    if (data.unidad !== undefined) candidateUpdates.unidad = data.unidad;
    if (data.maximo !== undefined) candidateUpdates.maximo = parseFloat(data.maximo) || 0;
    if (data.minimo !== undefined) candidateUpdates.minimo = parseFloat(data.minimo) || 0;
    if (data.fecha_vencimiento !== undefined) candidateUpdates.fecha_vencimiento = data.fecha_vencimiento;
    if (data.foto !== undefined) candidateUpdates.foto = data.foto;

    const setClauses = [];
    const setVals = [];

    if (columns.length > 0) {
      for (const col of columns) {
        const lowerCol = col.toLowerCase();
        if (lowerCol in candidateUpdates) {
          setClauses.push(`\`${col}\` = ?`);
          setVals.push(candidateUpdates[lowerCol]);
        }
      }
    } else {
      if (data.nombre !== undefined) { setClauses.push('`nombre` = ?'); setVals.push(data.nombre); }
      if (data.descripcion !== undefined) { setClauses.push('`descripcion` = ?'); setVals.push(data.descripcion); }
      if (data.categoria !== undefined) { setClauses.push('`categoria` = ?'); setVals.push(data.categoria); }
      if (data.precio !== undefined) { setClauses.push('`precio` = ?'); setVals.push(data.precio); }
      if (data.costo !== undefined) { setClauses.push('`costo` = ?'); setVals.push(data.costo); }
      if (data.cantidad !== undefined) { setClauses.push('`cantidad` = ?'); setVals.push(data.cantidad); }
    }

    if (setClauses.length === 0) {
      return res.json({ success: true, message: 'Nada que actualizar' });
    }

    // Agregar condiciones WHERE seguras
    const whereConditions = [];
    if (columns.some(c => c.toLowerCase() === 'uuid')) {
      whereConditions.push('`uuid` = ?');
      setVals.push(uuid);
    }
    if (columns.some(c => c.toLowerCase() === 'id')) {
      whereConditions.push('`id` = ?');
      setVals.push(uuid);
    }
    if (columns.some(c => c.toLowerCase() === 'idproducto')) {
      whereConditions.push('`IDProducto` = ?');
      setVals.push(uuid);
    }

    let whereClause = whereConditions.length > 0 ? `(${whereConditions.join(' OR ')})` : '`id` = ?';
    if (whereConditions.length === 0) setVals.push(uuid);

    if (columns.some(c => c.toLowerCase() === 'cuenta_id')) {
      whereClause += ' AND (`cuenta_id` = ? OR `cuenta_id` IS NULL)';
      setVals.push(cuentaId);
    }

    const sql = `UPDATE \`${tableName}\` SET ${setClauses.join(', ')} WHERE ${whereClause}`;
    await pool.query(sql, setVals);

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
    const { tableName, columns } = await getProductosColumns();

    const hasEliminado = columns.some(c => c.toLowerCase() === 'eliminado');
    const hasUuid = columns.some(c => c.toLowerCase() === 'uuid');
    const hasId = columns.some(c => c.toLowerCase() === 'id');
    const hasIDProducto = columns.some(c => c.toLowerCase() === 'idproducto');
    const hasCuentaId = columns.some(c => c.toLowerCase() === 'cuenta_id');

    const idCols = [];
    const vals = [];

    if (hasUuid) { idCols.push('`uuid` = ?'); vals.push(uuid); }
    if (hasId) { idCols.push('`id` = ?'); vals.push(uuid); }
    if (hasIDProducto) { idCols.push('`IDProducto` = ?'); vals.push(uuid); }
    if (idCols.length === 0) { idCols.push('`id` = ?'); vals.push(uuid); }

    let whereClause = `(${idCols.join(' OR ')})`;
    if (hasCuentaId) {
      whereClause += ' AND (`cuenta_id` = ? OR `cuenta_id` IS NULL)';
      vals.push(cuentaId);
    }

    if (hasEliminado) {
      const colElim = columns.find(c => c.toLowerCase() === 'eliminado') || 'eliminado';
      await pool.query(`UPDATE \`${tableName}\` SET \`${colElim}\` = 1 WHERE ${whereClause}`, vals);
    } else {
      await pool.query(`DELETE FROM \`${tableName}\` WHERE ${whereClause}`, vals);
    }

    res.json({
      success: true,
      message: 'Producto eliminado exitosamente'
    });
  } catch (error) {
    next(error);
  }
}
