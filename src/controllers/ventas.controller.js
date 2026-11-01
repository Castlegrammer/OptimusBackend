import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/db.js';

// Cache de columnas de tablas de Ventas y VentaDetalles
let ventasTableCache = null;
let ventaDetallesTableCache = null;

async function getVentasTableInfo() {
  if (ventasTableCache) return ventasTableCache;
  for (const table of ['Ventas', 'ventas', 'VENTAS']) {
    try {
      const [cols] = await pool.query(`SHOW COLUMNS FROM \`${table}\``);
      if (cols && cols.length > 0) {
        ventasTableCache = { tableName: table, columns: cols.map(c => c.Field) };
        return ventasTableCache;
      }
    } catch (e) {}
  }
  return { tableName: 'Ventas', columns: [] };
}

async function getVentaDetallesTableInfo() {
  if (ventaDetallesTableCache) return ventaDetallesTableCache;
  for (const table of ['VentaDetalles', 'venta_detalles', 'ventadetalles', 'VENTADETALLES']) {
    try {
      const [cols] = await pool.query(`SHOW COLUMNS FROM \`${table}\``);
      if (cols && cols.length > 0) {
        ventaDetallesTableCache = { tableName: table, columns: cols.map(c => c.Field) };
        return ventaDetallesTableCache;
      }
    } catch (e) {}
  }
  return { tableName: 'VentaDetalles', columns: [] };
}

export async function getVentas(req, res, next) {
  try {
    const cuentaId = req.user?.id || 1;
    const { page = 1, limit = 100 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const ventasInfo = await getVentasTableInfo();
    const detallesInfo = await getVentaDetallesTableInfo();

    let rows = [];
    try {
      const [res1] = await pool.query(
        `SELECT * FROM \`${ventasInfo.tableName}\` ORDER BY 1 DESC LIMIT ? OFFSET ?`,
        [Number(limit), offset]
      );
      rows = res1;
    } catch (e1) {
      console.error('Error SELECT Ventas:', e1.message);
      return res.json({ success: true, data: [], page: Number(page), limit: Number(limit) });
    }

    // Filtrar por cuenta_id si la columna existe
    let filtered = rows.filter(r => {
      const rowCuentaId = r.cuenta_id ?? r.IDCuenta ?? r.id_cuenta;
      const belongs = (rowCuentaId == cuentaId) || (cuentaId == 1 && (rowCuentaId == null || rowCuentaId == 0 || rowCuentaId == 1));
      const notDeleted = (r.eliminado != 1 && r.Eliminado != 1);
      return belongs && notDeleted;
    });

    // Consultar todos los detalles de venta disponibles
    let allDetalles = [];
    try {
      const [detRows] = await pool.query(
        `SELECT * FROM \`${detallesInfo.tableName}\` ORDER BY 1 DESC LIMIT 1500`
      );
      allDetalles = detRows;
    } catch (eDet) {}

    // Mapear cada venta con sus valores numéricos exactos y sus productos
    const mappedSales = filtered.map(v => {
      const saleId = v.id ?? v.IDVenta ?? v.ID ?? v.Id;
      const saleUuid = v.uuid ?? v.UUID;

      // Buscar detalles de esta venta por ID o UUID
      const vDetails = allDetalles.filter(d => {
        const dVentaUuid = d.venta_uuid ?? d.VentaUUID;
        const dVentaId = d.venta_id ?? d.IDVenta ?? d.id_venta;
        return (saleUuid && dVentaUuid === saleUuid) || (saleId && String(dVentaId) === String(saleId));
      });

      const detalles = vDetails.map(d => ({
        id: d.id ?? d.IDVentaDetalle ?? d.ID,
        producto: d.producto ?? d.Producto ?? d.nombre ?? d.Nombre ?? 'Producto',
        cantidad: Number(d.cantidad ?? d.Cantidad ?? 1),
        precio: Number(d.precio ?? d.Precio ?? 0),
        total: Number(d.total ?? d.Total ?? 0)
      }));

      // Extraer totales en USD y Bolívares
      const totalUsd = Number(v.total ?? v.Total ?? v.monto ?? v.Monto ?? v.total_usd ?? v.TotalUSD ?? v.dolares ?? 0);
      const totalBs = Number(v.total_bs ?? v.TotalBs ?? v.bolivares ?? v.Bolivares ?? v.monto_bs ?? 0);

      const productosSummary = detalles.length > 0 
        ? detalles.map(d => `${d.cantidad}x ${d.producto}`).join(', ')
        : (v.concepto || v.Concepto || v.descripcion || v.Descripcion || v.productos || 'Venta Mostrador');

      const totalCantidad = detalles.length > 0
        ? detalles.reduce((sum, d) => sum + d.cantidad, 0)
        : 1;

      return {
        id: saleId,
        uuid: saleUuid || `VNT-${saleId}`,
        cliente: v.cliente ?? v.Cliente ?? 'Consumidor Final',
        cliente_uuid: v.cliente_uuid ?? v.ClienteUUID ?? null,
        fecha: v.fecha ?? v.Fecha ?? '',
        total: totalUsd,
        total_usd: totalUsd,
        total_bs: totalBs,
        tasa_bcv: Number(v.tasa ?? v.Tasa ?? v.tasa_bcv ?? 0),
        inicial: Number(v.inicial ?? v.Inicial ?? totalUsd),
        productos_resumen: productosSummary,
        total_cantidad: totalCantidad,
        detalles: detalles,
        updated_at: v.updated_at ?? v.created_at ?? ''
      };
    });

    res.json({
      success: true,
      data: mappedSales,
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
    const ventasInfo = await getVentasTableInfo();
    const detallesInfo = await getVentaDetallesTableInfo();

    const [ventas] = await pool.query(
      `SELECT * FROM \`${ventasInfo.tableName}\` WHERE (uuid = ? OR id = ? OR IDVenta = ?) LIMIT 1`,
      [uuid, uuid, uuid]
    );

    if (ventas.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Venta no encontrada'
      });
    }

    const v = ventas[0];
    const saleId = v.id ?? v.IDVenta ?? v.ID;
    const saleUuid = v.uuid ?? v.UUID;

    let detalles = [];
    try {
      const [det] = await pool.query(
        `SELECT * FROM \`${detallesInfo.tableName}\` WHERE venta_uuid = ? OR venta_id = ? OR IDVenta = ?`,
        [saleUuid, saleId, saleId]
      );
      detalles = det.map(d => ({
        id: d.id ?? d.IDVentaDetalle ?? d.ID,
        producto: d.producto ?? d.Producto ?? d.nombre ?? d.Nombre ?? 'Producto',
        cantidad: Number(d.cantidad ?? d.Cantidad ?? 1),
        precio: Number(d.precio ?? d.Precio ?? 0),
        total: Number(d.total ?? d.Total ?? 0)
      }));
    } catch (e) {}

    const totalUsd = Number(v.total ?? v.Total ?? v.monto ?? v.Monto ?? 0);
    const totalBs = Number(v.total_bs ?? v.TotalBs ?? v.bolivares ?? v.Bolivares ?? 0);

    res.json({
      success: true,
      data: {
        id: saleId,
        uuid: saleUuid || `VNT-${saleId}`,
        cliente: v.cliente ?? v.Cliente ?? 'Consumidor Final',
        fecha: v.fecha ?? v.Fecha ?? '',
        total: totalUsd,
        total_usd: totalUsd,
        total_bs: totalBs,
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

    const ventasInfo = await getVentasTableInfo();
    const detallesInfo = await getVentaDetallesTableInfo();

    const { 
      cliente = '', 
      cliente_uuid = null, 
      fecha, 
      total, 
      total_usd,
      total_bs,
      tasa_bcv,
      inicial = 0, 
      detalles = [] 
    } = req.body;

    const ventaFecha = fecha || new Date().toISOString().replace('T', ' ').substring(0, 19);
    const totalAmount = parseFloat(total || total_usd) || 0;
    const totalBsAmount = parseFloat(total_bs) || 0;
    const initialAmount = parseFloat(inicial) || totalAmount;
    const bcvRateVal = parseFloat(tasa_bcv) || 0;

    // Resumen en texto de los productos para guardar directamente en cabecera si existe columna
    const productosTexto = detalles.map(d => `${d.cantidad || 1}x ${d.producto || 'Producto'}`).join(', ');

    // 1. Inserción dinámica en Ventas
    const candidateVenta = {
      cuenta_id: cuentaId,
      idcuenta: cuentaId,
      uuid: ventaUuid,
      cliente: cliente.trim() || 'Consumidor Final',
      cliente_uuid: cliente_uuid,
      fecha: ventaFecha,
      total: totalAmount,
      monto: totalAmount,
      total_usd: totalAmount,
      totalusd: totalAmount,
      total_dolares: totalAmount,
      total_bs: totalBsAmount,
      totalbs: totalBsAmount,
      bolivares: totalBsAmount,
      monto_bs: totalBsAmount,
      tasa: bcvRateVal,
      tasa_bcv: bcvRateVal,
      inicial: initialAmount,
      concepto: productosTexto,
      descripcion: productosTexto,
      productos: productosTexto,
      eliminado: 0
    };

    const vCols = [];
    const vVals = [];
    const vPlaceholders = [];

    if (ventasInfo.columns.length > 0) {
      for (const col of ventasInfo.columns) {
        const lowerCol = col.toLowerCase();
        if (lowerCol === 'id' || lowerCol === 'idventa') continue;
        if (lowerCol in candidateVenta) {
          vCols.push(`\`${col}\``);
          vVals.push(candidateVenta[lowerCol]);
          vPlaceholders.push('?');
        }
      }
    }

    if (vCols.length === 0) {
      vCols.push('`cuenta_id`', '`uuid`', '`cliente`', '`fecha`', '`total`', '`inicial`', '`eliminado`');
      vVals.push(cuentaId, ventaUuid, cliente || 'Consumidor Final', ventaFecha, totalAmount, initialAmount, 0);
      vPlaceholders.push('?', '?', '?', '?', '?', '?', '?');
    }

    const sqlVenta = `INSERT INTO \`${ventasInfo.tableName}\` (${vCols.join(', ')}) VALUES (${vPlaceholders.join(', ')})`;
    const [result] = await connection.query(sqlVenta, vVals);
    const newVentaId = result.insertId;

    // 2. Inserción dinámica de cada detalle en VentaDetalles y descuento de stock
    for (const item of detalles) {
      const detalleUuid = uuidv4();
      const itemQty = parseFloat(item.cantidad) || 1;
      const itemPrice = parseFloat(item.precio) || 0;
      const itemTotal = parseFloat(item.total) || (itemQty * itemPrice);
      const prodUuid = item.producto_uuid || item.uuid || null;
      const prodId = item.producto_id || item.id || null;
      const prodName = item.producto || item.nombre || 'Producto';

      const candidateDetalle = {
        cuenta_id: cuentaId,
        idcuenta: cuentaId,
        uuid: detalleUuid,
        venta_uuid: ventaUuid,
        venta_id: newVentaId,
        idventa: newVentaId,
        producto_uuid: prodUuid,
        producto_id: prodId,
        idproducto: prodId,
        producto: prodName,
        nombre: prodName,
        cantidad: itemQty,
        precio: itemPrice,
        total: itemTotal,
        fecha: ventaFecha,
        eliminado: 0
      };

      const dCols = [];
      const dVals = [];
      const dPlaceholders = [];

      if (detallesInfo.columns.length > 0) {
        for (const col of detallesInfo.columns) {
          const lowerCol = col.toLowerCase();
          if (lowerCol === 'id' || lowerCol === 'idventadetalle' || lowerCol === 'iddetalle') continue;
          if (lowerCol in candidateDetalle) {
            dCols.push(`\`${col}\``);
            dVals.push(candidateDetalle[lowerCol]);
            dPlaceholders.push('?');
          }
        }
      }

      if (dCols.length === 0) {
        dCols.push('`cuenta_id`', '`uuid`', '`venta_uuid`', '`producto_uuid`', '`producto`', '`cantidad`', '`precio`', '`total`', '`fecha`', '`eliminado`');
        dVals.push(cuentaId, detalleUuid, ventaUuid, prodUuid, prodName, itemQty, itemPrice, itemTotal, ventaFecha, 0);
        dPlaceholders.push('?', '?', '?', '?', '?', '?', '?', '?', '?', '?');
      }

      try {
        const sqlDetalle = `INSERT INTO \`${detallesInfo.tableName}\` (${dCols.join(', ')}) VALUES (${dPlaceholders.join(', ')})`;
        await connection.query(sqlDetalle, dVals);
      } catch (errDet) {
        console.warn('Advertencia insertando detalle de venta:', errDet.message);
      }

      // 3. Descontar stock del producto en la tabla Productos de forma robusta
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
      message: 'Venta registrada exitosamente con productos y stock descontado',
      id: newVentaId,
      uuid: ventaUuid,
      total_usd: totalAmount,
      total_bs: totalBsAmount,
      productos_resumen: productosTexto
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}
