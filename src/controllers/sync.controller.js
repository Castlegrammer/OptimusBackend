import { pool } from '../config/db.js';

export async function pushSync(req, res, next) {
  const connection = await pool.getConnection();
  const cuentaId = req.user.id;
  const serverTime = new Date().toISOString();

  try {
    await connection.beginTransaction();

    const {
      dispositivo_id = 'android-app',
      categorias = [],
      clientes = [],
      proveedores = [],
      productos = [],
      ventas = [],
      venta_detalles = [],
      compras = [],
      compra_detalles = [],
      abonos_clientes = [],
      pagos_proveedores = []
    } = req.body;

    let totalProcesados = 0;
    const syncedUuids = {
      categorias: [],
      clientes: [],
      proveedores: [],
      productos: [],
      ventas: [],
      venta_detalles: [],
      compras: [],
      compra_detalles: [],
      abonos_clientes: [],
      pagos_proveedores: []
    };

    // 1. Categorías
    for (const c of categorias) {
      await connection.query(
        `INSERT INTO Categorias (cuenta_id, uuid, nombre, eliminado)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           nombre = VALUES(nombre),
           eliminado = VALUES(eliminado)`,
        [cuentaId, c.uuid, c.nombre, c.eliminado ? 1 : 0]
      );
      syncedUuids.categorias.push(c.uuid);
      totalProcesados++;
    }

    // 2. Clientes
    for (const c of clientes) {
      await connection.query(
        `INSERT INTO Clientes (cuenta_id, uuid, nombre, responsable, direccion, telefono, zona, fecha_creacion, eliminado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           nombre = VALUES(nombre),
           responsable = VALUES(responsable),
           direccion = VALUES(direccion),
           telefono = VALUES(telefono),
           zona = VALUES(zona),
           fecha_creacion = VALUES(fecha_creacion),
           eliminado = VALUES(eliminado)`,
        [cuentaId, c.uuid, c.nombre, c.responsable || '', c.direccion || '', c.telefono || '', c.zona || '', c.fecha_creacion || '', c.eliminado ? 1 : 0]
      );
      syncedUuids.clientes.push(c.uuid);
      totalProcesados++;
    }

    // 3. Proveedores (con asignación automática de fecha y hora actual)
    for (const p of proveedores) {
      const nowP = new Date();
      const padP = (n) => String(n).padStart(2, '0');
      const autoNowP = `${nowP.getFullYear()}-${padP(nowP.getMonth() + 1)}-${padP(nowP.getDate())} ${padP(nowP.getHours())}:${padP(nowP.getMinutes())}:${padP(nowP.getSeconds())}`;
      const fechaCreacionP = p.fecha_creacion || autoNowP;

      try {
        await connection.query(
          `INSERT INTO Proveedores (cuenta_id, uuid, nombre, responsable, direccion, telefono, zona, fecha_creacion, eliminado)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             nombre = VALUES(nombre),
             responsable = VALUES(responsable),
             direccion = VALUES(direccion),
             telefono = VALUES(telefono),
             zona = VALUES(zona),
             fecha_creacion = COALESCE(VALUES(fecha_creacion), fecha_creacion),
             eliminado = VALUES(eliminado)`,
          [cuentaId, p.uuid, p.nombre, p.responsable || '', p.direccion || '', p.telefono || '', p.zona || '', fechaCreacionP, p.eliminado ? 1 : 0]
        );
      } catch (errProv) {
        if (errProv.code === 'ER_BAD_FIELD_ERROR' || String(errProv.message).includes('fecha_creacion')) {
          try {
            await connection.query('ALTER TABLE `Proveedores` ADD COLUMN `fecha_creacion` VARCHAR(50) DEFAULT NULL');
            await connection.query(
              `INSERT INTO Proveedores (cuenta_id, uuid, nombre, responsable, direccion, telefono, zona, fecha_creacion, eliminado)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE
                 nombre = VALUES(nombre),
                 responsable = VALUES(responsable),
                 direccion = VALUES(direccion),
                 telefono = VALUES(telefono),
                 zona = VALUES(zona),
                 fecha_creacion = COALESCE(VALUES(fecha_creacion), fecha_creacion),
                 eliminado = VALUES(eliminado)`,
              [cuentaId, p.uuid, p.nombre, p.responsable || '', p.direccion || '', p.telefono || '', p.zona || '', fechaCreacionP, p.eliminado ? 1 : 0]
            );
          } catch (e2) {
            await connection.query(
              `INSERT INTO Proveedores (cuenta_id, uuid, nombre, responsable, direccion, telefono, zona, eliminado)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE
                 nombre = VALUES(nombre),
                 responsable = VALUES(responsable),
                 direccion = VALUES(direccion),
                 telefono = VALUES(telefono),
                 zona = VALUES(zona),
                 eliminado = VALUES(eliminado)`,
              [cuentaId, p.uuid, p.nombre, p.responsable || '', p.direccion || '', p.telefono || '', p.zona || '', p.eliminado ? 1 : 0]
            );
          }
        } else {
          throw errProv;
        }
      }
      syncedUuids.proveedores.push(p.uuid);
      totalProcesados++;
    }

    // 4. Productos
    for (const prod of productos) {
      await connection.query(
        `INSERT INTO Productos (
           cuenta_id, uuid, nombre, descripcion, categoria, categoria_uuid,
           proveedor, proveedor_uuid, marca, tamano, color, cantidad,
           costo, precio, unidad, maximo, minimo, fecha_vencimiento, foto, eliminado
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           nombre = VALUES(nombre),
           descripcion = VALUES(descripcion),
           categoria = VALUES(categoria),
           categoria_uuid = VALUES(categoria_uuid),
           proveedor = VALUES(proveedor),
           proveedor_uuid = VALUES(proveedor_uuid),
           marca = VALUES(marca),
           tamano = VALUES(tamano),
           color = VALUES(color),
           cantidad = VALUES(cantidad),
           costo = VALUES(costo),
           precio = VALUES(precio),
           unidad = VALUES(unidad),
           maximo = VALUES(maximo),
           minimo = VALUES(minimo),
           fecha_vencimiento = VALUES(fecha_vencimiento),
           foto = VALUES(foto),
           eliminado = VALUES(eliminado)`,
        [
          cuentaId, prod.uuid, prod.nombre, prod.descripcion || '', prod.categoria || '', prod.categoria_uuid || null,
          prod.proveedor || '', prod.proveedor_uuid || null, prod.marca || '', prod.tamano || '', prod.color || '',
          prod.cantidad || 0, prod.costo || 0, prod.precio || 0, prod.unidad || 'Unidad', prod.maximo || 0,
          prod.minimo || 0, prod.fecha_vencimiento || '', prod.foto || null, prod.eliminado ? 1 : 0
        ]
      );
      syncedUuids.productos.push(prod.uuid);
      totalProcesados++;
    }

    // 5. Ventas
    for (const v of ventas) {
      await connection.query(
        `INSERT INTO Ventas (cuenta_id, uuid, cliente, cliente_uuid, fecha, total, inicial, eliminado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           cliente = VALUES(cliente),
           cliente_uuid = VALUES(cliente_uuid),
           fecha = VALUES(fecha),
           total = VALUES(total),
           inicial = VALUES(inicial),
           eliminado = VALUES(eliminado)`,
        [cuentaId, v.uuid, v.cliente || '', v.cliente_uuid || null, v.fecha || '', v.total || 0, v.inicial || 0, v.eliminado ? 1 : 0]
      );
      syncedUuids.ventas.push(v.uuid);
      totalProcesados++;
    }

    // 6. Venta Detalles
    for (const vd of venta_detalles) {
      await connection.query(
        `INSERT INTO VentaDetalles (cuenta_id, uuid, venta_uuid, producto_uuid, producto, cantidad, precio, total, fecha, eliminado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           venta_uuid = VALUES(venta_uuid),
           producto_uuid = VALUES(producto_uuid),
           producto = VALUES(producto),
           cantidad = VALUES(cantidad),
           precio = VALUES(precio),
           total = VALUES(total),
           fecha = VALUES(fecha),
           eliminado = VALUES(eliminado)`,
        [cuentaId, vd.uuid, vd.venta_uuid, vd.producto_uuid || null, vd.producto, vd.cantidad || 0, vd.precio || 0, vd.total || 0, vd.fecha || '', vd.eliminado ? 1 : 0]
      );
      syncedUuids.venta_detalles.push(vd.uuid);
      totalProcesados++;
    }

    // 7. Compras
    for (const c of compras) {
      await connection.query(
        `INSERT INTO Compras (cuenta_id, uuid, proveedor, proveedor_uuid, fecha, total, inicial, eliminado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           proveedor = VALUES(proveedor),
           proveedor_uuid = VALUES(proveedor_uuid),
           fecha = VALUES(fecha),
           total = VALUES(total),
           inicial = VALUES(inicial),
           eliminado = VALUES(eliminado)`,
        [cuentaId, c.uuid, c.proveedor || '', c.proveedor_uuid || null, c.fecha || '', c.total || 0, c.inicial || 0, c.eliminado ? 1 : 0]
      );
      syncedUuids.compras.push(c.uuid);
      totalProcesados++;
    }

    // 8. Compra Detalles
    for (const cd of compra_detalles) {
      await connection.query(
        `INSERT INTO CompraDetalles (cuenta_id, uuid, compra_uuid, producto_uuid, producto, cantidad, precio, total, fecha, eliminado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           compra_uuid = VALUES(compra_uuid),
           producto_uuid = VALUES(producto_uuid),
           producto = VALUES(producto),
           cantidad = VALUES(cantidad),
           precio = VALUES(precio),
           total = VALUES(total),
           fecha = VALUES(fecha),
           eliminado = VALUES(eliminado)`,
        [cuentaId, cd.uuid, cd.compra_uuid, cd.producto_uuid || null, cd.producto, cd.cantidad || 0, cd.precio || 0, cd.total || 0, cd.fecha || '', cd.eliminado ? 1 : 0]
      );
      syncedUuids.compra_detalles.push(cd.uuid);
      totalProcesados++;
    }

    // 9. Abonos Clientes
    for (const a of abonos_clientes) {
      await connection.query(
        `INSERT INTO AbonosClientes (cuenta_id, uuid, cliente, cliente_uuid, fecha, monto, eliminado)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           cliente = VALUES(cliente),
           cliente_uuid = VALUES(cliente_uuid),
           fecha = VALUES(fecha),
           monto = VALUES(monto),
           eliminado = VALUES(eliminado)`,
        [cuentaId, a.uuid, a.cliente || '', a.cliente_uuid || null, a.fecha || '', a.monto || 0, a.eliminado ? 1 : 0]
      );
      syncedUuids.abonos_clientes.push(a.uuid);
      totalProcesados++;
    }

    // 10. Pagos Proveedores
    for (const p of pagos_proveedores) {
      await connection.query(
        `INSERT INTO PagosAProveedores (cuenta_id, uuid, proveedor, proveedor_uuid, fecha, monto, eliminado)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           proveedor = VALUES(proveedor),
           proveedor_uuid = VALUES(proveedor_uuid),
           fecha = VALUES(fecha),
           monto = VALUES(monto),
           eliminado = VALUES(eliminado)`,
        [cuentaId, p.uuid, p.proveedor || '', p.proveedor_uuid || null, p.fecha || '', p.monto || 0, p.eliminado ? 1 : 0]
      );
      syncedUuids.pagos_proveedores.push(p.uuid);
      totalProcesados++;
    }

    // Registro de log de sincronización
    await connection.query(
      `INSERT INTO SyncLogs (cuenta_id, dispositivo_id, tipo_operacion, registros_afectados, ip_origen)
       VALUES (?, ?, 'PUSH', ?, ?)`,
      [cuentaId, dispositivo_id, totalProcesados, req.ip || null]
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Sincronización PUSH completada con éxito',
      server_time: serverTime,
      total_procesados: totalProcesados,
      synced_uuids: syncedUuids
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

export async function pullSync(req, res, next) {
  const cuentaId = req.user.id;
  const since = req.query.since || '1970-01-01 00:00:00';
  const serverTime = new Date().toISOString();

  try {
    // Consultamos cambios en cada entidad posteriores a 'since'
    const [categorias] = await pool.query(
      'SELECT uuid, nombre, eliminado, updated_at FROM Categorias WHERE cuenta_id = ? AND updated_at > ?',
      [cuentaId, since]
    );

    let clientes = [];
    try {
      const [resCli] = await pool.query('SELECT * FROM Clientes');
      clientes = resCli.map(c => ({
        uuid: c.uuid || `CLI-${c.id}`,
        nombre: c.nombre || '',
        responsable: c.responsable || '',
        direccion: c.direccion || '',
        telefono: c.telefono || '',
        zona: c.zona || 'Principal',
        fecha_creacion: c.fecha_creacion || '',
        eliminado: c.eliminado || 0,
        updated_at: c.updated_at || c.fecha_creacion || ''
      }));
    } catch (eCli) {
      console.warn('Sync clientes pull fallback:', eCli.message);
    }

    let proveedores = [];
    try {
      const [resProv] = await pool.query('SELECT * FROM Proveedores');
      proveedores = resProv.map(p => ({
        uuid: p.uuid || `PROV-${p.id}`,
        nombre: p.nombre || '',
        responsable: p.responsable || '',
        direccion: p.direccion || '',
        telefono: p.telefono || '',
        zona: p.zona || 'Principal',
        fecha_creacion: p.fecha_creacion || '',
        eliminado: p.eliminado || 0,
        updated_at: p.updated_at || p.fecha_creacion || ''
      }));
    } catch (eProv) {
      console.warn('Sync proveedores pull fallback:', eProv.message);
    }

    const [productos] = await pool.query(
      `SELECT uuid, nombre, descripcion, categoria, categoria_uuid, proveedor, proveedor_uuid,
              marca, tamano, color, cantidad, costo, precio, unidad, maximo, minimo,
              fecha_vencimiento, foto, eliminado, updated_at
       FROM Productos WHERE cuenta_id = ? AND updated_at > ?`,
      [cuentaId, since]
    );

    const [ventas] = await pool.query(
      'SELECT uuid, cliente, cliente_uuid, fecha, total, inicial, eliminado, updated_at FROM Ventas WHERE cuenta_id = ? AND updated_at > ?',
      [cuentaId, since]
    );

    const [venta_detalles] = await pool.query(
      'SELECT uuid, venta_uuid, producto_uuid, producto, cantidad, precio, total, fecha, eliminado, updated_at FROM VentaDetalles WHERE cuenta_id = ? AND updated_at > ?',
      [cuentaId, since]
    );

    const [compras] = await pool.query(
      'SELECT uuid, proveedor, proveedor_uuid, fecha, total, inicial, eliminado, updated_at FROM Compras WHERE cuenta_id = ? AND updated_at > ?',
      [cuentaId, since]
    );

    const [compra_detalles] = await pool.query(
      'SELECT uuid, compra_uuid, producto_uuid, producto, cantidad, precio, total, fecha, eliminado, updated_at FROM CompraDetalles WHERE cuenta_id = ? AND updated_at > ?',
      [cuentaId, since]
    );

    const [abonos_clientes] = await pool.query(
      'SELECT uuid, cliente, cliente_uuid, fecha, monto, eliminado, updated_at FROM AbonosClientes WHERE cuenta_id = ? AND updated_at > ?',
      [cuentaId, since]
    );

    const [pagos_proveedores] = await pool.query(
      'SELECT uuid, proveedor, proveedor_uuid, fecha, monto, eliminado, updated_at FROM PagosAProveedores WHERE cuenta_id = ? AND updated_at > ?',
      [cuentaId, since]
    );

    const totalNovedades =
      categorias.length +
      clientes.length +
      proveedores.length +
      productos.length +
      ventas.length +
      venta_detalles.length +
      compras.length +
      compra_detalles.length +
      abonos_clientes.length +
      pagos_proveedores.length;

    res.json({
      success: true,
      message: 'Sincronización PULL ejecutada con éxito',
      server_time: serverTime,
      total_novedades: totalNovedades,
      data: {
        categorias,
        clientes,
        proveedores,
        productos,
        ventas,
        venta_detalles,
        compras,
        compra_detalles,
        abonos_clientes,
        pagos_proveedores
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getSyncStatus(req, res, next) {
  try {
    const cuentaId = req.user.id;

    const [[{ total_productos }]] = await pool.query(
      'SELECT COUNT(*) as total_productos FROM Productos WHERE cuenta_id = ? AND eliminado = 0',
      [cuentaId]
    );

    const [[{ total_clientes }]] = await pool.query(
      'SELECT COUNT(*) as total_clientes FROM Clientes WHERE cuenta_id = ? AND eliminado = 0',
      [cuentaId]
    );

    const [[{ total_ventas }]] = await pool.query(
      'SELECT COUNT(*) as total_ventas FROM Ventas WHERE cuenta_id = ? AND eliminado = 0',
      [cuentaId]
    );

    const [lastSync] = await pool.query(
      'SELECT created_at, tipo_operacion, registros_afectados FROM SyncLogs WHERE cuenta_id = ? ORDER BY id DESC LIMIT 1',
      [cuentaId]
    );

    res.json({
      success: true,
      status: 'online',
      cuenta: {
        id: req.user.id,
        nombre: req.user.nombre,
        email: req.user.email
      },
      counts: {
        productos: total_productos,
        clientes: total_clientes,
        ventas: total_ventas
      },
      last_sync: lastSync.length > 0 ? lastSync[0] : null,
      server_time: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
}
