import { pool } from '../config/db.js';

export async function pushSync(req, res, next) {
  const connection = await pool.getConnection();
  const cuentaId = req.user?.id || 1;
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
      try {
        await connection.query(
          `INSERT INTO Categorias (cuenta_id, uuid, nombre, eliminado)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             nombre = VALUES(nombre),
             eliminado = VALUES(eliminado)`,
          [cuentaId, c.uuid, c.nombre, c.eliminado ? 1 : 0]
        );
      } catch (eCat) {
        await connection.query(
          `INSERT INTO Categorias (cuenta_id, uuid, Nombre, Eliminado)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             Nombre = VALUES(Nombre),
             Eliminado = VALUES(Eliminado)`,
          [cuentaId, c.uuid, c.nombre, c.eliminado ? 1 : 0]
        );
      }
      syncedUuids.categorias.push(c.uuid);
      totalProcesados++;
    }

    // 2. Clientes
    for (const c of clientes) {
      const nowC = new Date();
      const padC = (n) => String(n).padStart(2, '0');
      const autoNowC = `${nowC.getFullYear()}-${padC(nowC.getMonth() + 1)}-${padC(nowC.getDate())} ${padC(nowC.getHours())}:${padC(nowC.getMinutes())}:${padC(nowC.getSeconds())}`;
      const fechaCreacionC = c.fecha_creacion || autoNowC;

      try {
        await connection.query(
          `INSERT INTO Clientes (cuenta_id, uuid, nombre, responsable, direccion, telefono, zona, fecha_creacion, eliminado)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             nombre = VALUES(nombre),
             responsable = VALUES(responsable),
             direccion = VALUES(direccion),
             telefono = VALUES(telefono),
             zona = VALUES(zona),
             fecha_creacion = COALESCE(VALUES(fecha_creacion), fecha_creacion),
             eliminado = VALUES(eliminado)`,
          [cuentaId, c.uuid, c.nombre, c.responsable || '', c.direccion || '', c.telefono || '', c.zona || '', fechaCreacionC, c.eliminado ? 1 : 0]
        );
      } catch (errCli) {
        try {
          await connection.query(
            `INSERT INTO Clientes (cuenta_id, uuid, Nombre, Responsable, Direccion, Telefono, Zona, fecha_creacion, Eliminado)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               Nombre = VALUES(Nombre),
               Responsable = VALUES(Responsable),
               Direccion = VALUES(Direccion),
               Telefono = VALUES(Telefono),
               Zona = VALUES(Zona),
               fecha_creacion = COALESCE(VALUES(fecha_creacion), fecha_creacion),
               Eliminado = VALUES(Eliminado)`,
            [cuentaId, c.uuid, c.nombre, c.responsable || '', c.direccion || '', c.telefono || '', c.zona || '', fechaCreacionC, c.eliminado ? 1 : 0]
          );
        } catch (e2) {
          await connection.query(
            `INSERT INTO Clientes (cuenta_id, uuid, Nombre, Responsable, Direccion, Telefono, Zona, Eliminado)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               Nombre = VALUES(Nombre),
               Responsable = VALUES(Responsable),
               Direccion = VALUES(Direccion),
               Telefono = VALUES(Telefono),
               Zona = VALUES(Zona),
               Eliminado = VALUES(Eliminado)`,
            [cuentaId, c.uuid, c.nombre, c.responsable || '', c.direccion || '', c.telefono || '', c.zona || '', c.eliminado ? 1 : 0]
          );
        }
      }
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
        try {
          await connection.query(
            `INSERT INTO Proveedores (cuenta_id, uuid, Nombre, Responsable, Direccion, Telefono, Zona, fecha_creacion, Eliminado)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               Nombre = VALUES(Nombre),
               Responsable = VALUES(Responsable),
               Direccion = VALUES(Direccion),
               Telefono = VALUES(Telefono),
               Zona = VALUES(Zona),
               fecha_creacion = COALESCE(VALUES(fecha_creacion), fecha_creacion),
               Eliminado = VALUES(Eliminado)`,
            [cuentaId, p.uuid, p.nombre, p.responsable || '', p.direccion || '', p.telefono || '', p.zona || '', fechaCreacionP, p.eliminado ? 1 : 0]
          );
        } catch (e2) {
          await connection.query(
            `INSERT INTO Proveedores (cuenta_id, uuid, Nombre, Responsable, Direccion, Telefono, Zona, Eliminado)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               Nombre = VALUES(Nombre),
               Responsable = VALUES(Responsable),
               Direccion = VALUES(Direccion),
               Telefono = VALUES(Telefono),
               Zona = VALUES(Zona),
               Eliminado = VALUES(Eliminado)`,
            [cuentaId, p.uuid, p.nombre, p.responsable || '', p.direccion || '', p.telefono || '', p.zona || '', p.eliminado ? 1 : 0]
          );
        }
      }
      syncedUuids.proveedores.push(p.uuid);
      totalProcesados++;
    }

    // 4. Productos
    for (const prod of productos) {
      try {
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
      } catch (eProd) {
        console.warn('Sync push producto error:', eProd.message);
      }
      syncedUuids.productos.push(prod.uuid);
      totalProcesados++;
    }

    // 5. Ventas
    for (const v of ventas) {
      try {
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
      } catch (eV) {
        console.warn('Sync push venta error:', eV.message);
      }
      syncedUuids.ventas.push(v.uuid);
      totalProcesados++;
    }

    // 6. Venta Detalles
    for (const vd of venta_detalles) {
      try {
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
      } catch (eVD) {
        console.warn('Sync push venta detalle error:', eVD.message);
      }
      syncedUuids.venta_detalles.push(vd.uuid);
      totalProcesados++;
    }

    // 7. Compras
    for (const c of compras) {
      const cTotal = Number(c.total) || 0;
      const cInicial = Number(c.inicial !== undefined ? c.inicial : c.total) || 0;
      const cFecha = c.fecha || new Date().toISOString().split('T')[0];
      const cProv = c.proveedor || 'Proveedor Directo';

      try {
        await connection.query(
          `INSERT INTO Compras (cuenta_id, uuid, Proveedor, proveedor_uuid, Fecha, Total, Inicial, Eliminado)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             Proveedor = VALUES(Proveedor),
             proveedor_uuid = VALUES(proveedor_uuid),
             Fecha = VALUES(Fecha),
             Total = VALUES(Total),
             Inicial = VALUES(Inicial),
             Eliminado = VALUES(Eliminado)`,
          [cuentaId, c.uuid, cProv, c.proveedor_uuid || null, cFecha, cTotal, cInicial, c.eliminado ? 1 : 0]
        );
      } catch (eC1) {
        try {
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
            [cuentaId, c.uuid, cProv, c.proveedor_uuid || null, cFecha, cTotal, cInicial, c.eliminado ? 1 : 0]
          );
        } catch (eC2) {
          console.warn('Sync push compra error:', eC2.message);
        }
      }
      syncedUuids.compras.push(c.uuid);
      totalProcesados++;
    }

    // 8. Compra Detalles
    for (const cd of compra_detalles) {
      try {
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
      } catch (eCD) {
        console.warn('Sync push compra detalle error:', eCD.message);
      }
      syncedUuids.compra_detalles.push(cd.uuid);
      totalProcesados++;
    }

    // 9. Abonos Clientes
    for (const a of abonos_clientes) {
      try {
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
      } catch (eA) {
        console.warn('Sync push abono error:', eA.message);
      }
      syncedUuids.abonos_clientes.push(a.uuid);
      totalProcesados++;
    }

    // 10. Pagos Proveedores
    for (const p of pagos_proveedores) {
      try {
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
      } catch (eP) {
        console.warn('Sync push pago proveedor error:', eP.message);
      }
      syncedUuids.pagos_proveedores.push(p.uuid);
      totalProcesados++;
    }

    // Registro de log de sincronización
    try {
      await connection.query(
        `INSERT INTO SyncLogs (cuenta_id, dispositivo_id, tipo_operacion, registros_afectados, ip_origen)
         VALUES (?, ?, 'PUSH', ?, ?)`,
        [cuentaId, dispositivo_id, totalProcesados, req.ip || null]
      );
    } catch (eLog) {
      // Ignorar si SyncLogs no existe
    }

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
  const cuentaId = req.user?.id || 1;
  const since = req.query.since || '1970-01-01 00:00:00';
  const serverTime = new Date().toISOString();

  try {
    // 1. Categorías (filtradas por cuenta del usuario)
    let categorias = [];
    try {
      const [resCat] = await pool.query(
        'SELECT * FROM Categorias WHERE (cuenta_id = ? OR (cuenta_id IS NULL AND ? = 1)) AND (eliminado = 0 OR eliminado IS NULL)',
        [cuentaId, cuentaId]
      );
      categorias = resCat.map(c => ({
        id: c.id || c.IDCategoria || c.ID,
        uuid: c.uuid || `CAT-${c.id || c.IDCategoria}`,
        nombre: c.nombre || c.Nombre || '',
        eliminado: (c.eliminado == 1 || c.Eliminado == 1) ? 1 : 0,
        updated_at: c.updated_at || serverTime
      }));
    } catch (eCat) {
      console.warn('Sync categorias pull warning:', eCat.message);
    }

    // 2. Clientes (filtrados por cuenta del usuario)
    let clientes = [];
    try {
      const [resCli] = await pool.query('SELECT * FROM Clientes ORDER BY 1 DESC');
      clientes = resCli
        .filter(r => {
          const rowCuentaId = r.cuenta_id ?? r.IDCuenta ?? r.id_cuenta;
          return (rowCuentaId == cuentaId) || (cuentaId == 1 && (rowCuentaId == null || rowCuentaId == 0 || rowCuentaId == 1));
        })
        .map(c => ({
          id: c.IDCliente || c.id || c.ID,
          uuid: c.uuid || `CLI-${c.IDCliente || c.id}`,
          nombre: c.Nombre || c.nombre || '',
          responsable: c.Responsable || c.responsable || '',
          direccion: c.Direccion || c.direccion || '',
          telefono: c.Telefono || c.telefono || '',
          zona: c.Zona || c.zona || 'Principal',
          fecha_creacion: c.fecha_creacion || c.FechaCreacion || c.Fecha || '',
          eliminado: (c.Eliminado == 1 || c.eliminado == 1) ? 1 : 0,
          updated_at: c.updated_at || c.fecha_creacion || serverTime
        }));
    } catch (eCli) {
      console.warn('Sync clientes pull fallback:', eCli.message);
    }

    // 3. Proveedores (filtrados por cuenta del usuario)
    let proveedores = [];
    try {
      const [resProv] = await pool.query('SELECT * FROM Proveedores ORDER BY 1 DESC');
      proveedores = resProv
        .filter(r => {
          const rowCuentaId = r.cuenta_id ?? r.IDCuenta ?? r.id_cuenta;
          return (rowCuentaId == cuentaId) || (cuentaId == 1 && (rowCuentaId == null || rowCuentaId == 0 || rowCuentaId == 1));
        })
        .map(p => ({
          id: p.IDProveedor || p.IDCliente || p.id || p.ID,
          uuid: p.uuid || `PROV-${p.IDProveedor || p.IDCliente || p.id}`,
          nombre: p.Nombre || p.nombre || '',
          responsable: p.Responsable || p.responsable || '',
          direccion: p.Direccion || p.direccion || '',
          telefono: p.Telefono || p.telefono || '',
          zona: p.Zona || p.zona || 'Principal',
          fecha_creacion: p.fecha_creacion || p.FechaCreacion || p.Fecha_Creacion || p.Fecha || '',
          eliminado: (p.Eliminado == 1 || p.eliminado == 1) ? 1 : 0,
          updated_at: p.updated_at || p.fecha_creacion || serverTime
        }));
    } catch (eProv) {
      console.warn('Sync proveedores pull fallback:', eProv.message);
    }

    // 4. Productos (filtrados por cuenta del usuario)
    let productos = [];
    try {
      const [resProd] = await pool.query(
        'SELECT * FROM Productos WHERE (cuenta_id = ? OR (cuenta_id IS NULL AND ? = 1)) AND (eliminado = 0 OR eliminado IS NULL)',
        [cuentaId, cuentaId]
      );
      productos = resProd.map(p => ({
        uuid: p.uuid || `PROD-${p.id || p.IDProducto || p.ID}`,
        nombre: p.nombre || p.Nombre || '',
        descripcion: p.descripcion || p.Descripcion || '',
        categoria: p.categoria || p.Categoria || '',
        categoria_uuid: p.categoria_uuid || null,
        proveedor: p.proveedor || p.Proveedor || '',
        proveedor_uuid: p.proveedor_uuid || null,
        marca: p.marca || p.Marca || '',
        tamano: p.tamano || p.Tamano || '',
        color: p.color || p.Color || '',
        cantidad: p.cantidad ?? p.Cantidad ?? 0,
        costo: p.costo ?? p.Costo ?? 0,
        precio: p.precio ?? p.Precio ?? 0,
        unidad: p.unidad || p.Unidad || 'Unidad',
        maximo: p.maximo ?? p.Maximo ?? 100,
        minimo: p.minimo ?? p.Minimo ?? 5,
        fecha_vencimiento: p.fecha_vencimiento || p.FechaVencimiento || null,
        foto: p.foto || p.Foto || null,
        eliminado: (p.eliminado == 1 || p.Eliminado == 1) ? 1 : 0,
        updated_at: p.updated_at || serverTime
      }));
    } catch (eProd) {
      console.warn('Sync productos pull warning:', eProd.message);
    }

    // 5. Ventas (filtradas por cuenta del usuario)
    let ventas = [];
    try {
      const [resV] = await pool.query(
        'SELECT * FROM Ventas WHERE (cuenta_id = ? OR (cuenta_id IS NULL AND ? = 1))',
        [cuentaId, cuentaId]
      );
      ventas = resV.map(v => ({
        uuid: v.uuid || `VNT-${v.id || v.IDVenta || v.ID}`,
        cliente: v.cliente || v.Cliente || '',
        cliente_uuid: v.cliente_uuid || null,
        fecha: v.fecha || v.Fecha || '',
        total: v.total ?? v.Total ?? 0,
        inicial: v.inicial ?? v.Inicial ?? 0,
        eliminado: (v.eliminado == 1 || v.Eliminado == 1) ? 1 : 0,
        updated_at: v.updated_at || serverTime
      }));
    } catch (eV) {
      console.warn('Sync ventas pull warning:', eV.message);
    }

    // 6. Venta Detalles
    let venta_detalles = [];
    try {
      const [resVD] = await pool.query(
        'SELECT * FROM VentaDetalles WHERE (cuenta_id = ? OR (cuenta_id IS NULL AND ? = 1))',
        [cuentaId, cuentaId]
      );
      venta_detalles = resVD.map(vd => ({
        uuid: vd.uuid || `VD-${vd.id || vd.ID}`,
        venta_uuid: vd.venta_uuid || null,
        producto_uuid: vd.producto_uuid || null,
        producto: vd.producto || '',
        cantidad: vd.cantidad || 0,
        precio: vd.precio || 0,
        total: vd.total || 0,
        fecha: vd.fecha || '',
        eliminado: (vd.eliminado == 1 || vd.Eliminado == 1) ? 1 : 0,
        updated_at: vd.updated_at || serverTime
      }));
    } catch (eVD) {
      console.warn('Sync venta_detalles pull warning:', eVD.message);
    }

    // 7. Compras
    let compras = [];
    try {
      const [resC] = await pool.query(
        'SELECT * FROM Compras WHERE (cuenta_id = ? OR (cuenta_id IS NULL AND ? = 1)) ORDER BY 1 DESC',
        [cuentaId, cuentaId]
      );
      compras = resC.map(c => {
        const totalNum = Number(c.Total ?? c.total ?? c.monto ?? c.Monto ?? 0);
        const inicialNum = Number(c.Inicial ?? c.inicial ?? totalNum);
        return {
          id: c.IDCompra || c.id || c.ID,
          uuid: c.uuid || `COM-${c.IDCompra || c.id || Date.now()}`,
          proveedor: c.Proveedor || c.proveedor || 'Proveedor Directo',
          proveedor_uuid: c.proveedor_uuid || null,
          fecha: c.Fecha || c.fecha || '',
          total: isNaN(totalNum) ? 0 : totalNum,
          inicial: isNaN(inicialNum) ? 0 : inicialNum,
          eliminado: (c.Eliminado == 1 || c.eliminado == 1) ? 1 : 0,
          updated_at: c.updated_at || c.Fecha || serverTime
        };
      });
    } catch (eC) {
      console.warn('Sync compras pull warning:', eC.message);
    }

    // 8. Compra Detalles
    let compra_detalles = [];
    try {
      const [resCD] = await pool.query(
        'SELECT * FROM CompraDetalles WHERE (cuenta_id = ? OR (cuenta_id IS NULL AND ? = 1))',
        [cuentaId, cuentaId]
      );
      compra_detalles = resCD;
    } catch (eCD) {
      console.warn('Sync compra_detalles pull warning:', eCD.message);
    }

    // 9. Abonos Clientes
    let abonos_clientes = [];
    try {
      const [resAC] = await pool.query(
        'SELECT * FROM AbonosClientes WHERE (cuenta_id = ? OR (cuenta_id IS NULL AND ? = 1))',
        [cuentaId, cuentaId]
      );
      abonos_clientes = resAC;
    } catch (eAC) {
      console.warn('Sync abonos_clientes pull warning:', eAC.message);
    }

    // 10. Pagos Proveedores
    let pagos_proveedores = [];
    try {
      const [resPP] = await pool.query(
        'SELECT * FROM PagosAProveedores WHERE (cuenta_id = ? OR (cuenta_id IS NULL AND ? = 1))',
        [cuentaId, cuentaId]
      );
      pagos_proveedores = resPP;
    } catch (ePP) {
      console.warn('Sync pagos_proveedores pull warning:', ePP.message);
    }

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
    const cuentaId = req.user?.id || 1;

    let total_productos = 0;
    try {
      const [[resProd]] = await pool.query(
        'SELECT COUNT(*) as total FROM Productos WHERE (cuenta_id = ? OR (cuenta_id IS NULL AND ? = 1)) AND (eliminado = 0 OR eliminado IS NULL)',
        [cuentaId, cuentaId]
      );
      total_productos = resProd?.total || 0;
    } catch (e) {}

    let total_clientes = 0;
    try {
      const [[resCli]] = await pool.query(
        'SELECT COUNT(*) as total FROM Clientes WHERE (cuenta_id = ? OR (cuenta_id IS NULL AND ? = 1)) AND (Eliminado = 0 OR eliminado = 0 OR Eliminado IS NULL)',
        [cuentaId, cuentaId]
      );
      total_clientes = resCli?.total || 0;
    } catch (e) {}

    let total_ventas = 0;
    try {
      const [[resV]] = await pool.query(
        'SELECT COUNT(*) as total FROM Ventas WHERE (cuenta_id = ? OR (cuenta_id IS NULL AND ? = 1)) AND (eliminado = 0 OR eliminado IS NULL)',
        [cuentaId, cuentaId]
      );
      total_ventas = resV?.total || 0;
    } catch (e) {}

    let lastSync = null;
    try {
      const [rows] = await pool.query(
        'SELECT created_at, tipo_operacion, registros_afectados FROM SyncLogs WHERE cuenta_id = ? ORDER BY id DESC LIMIT 1',
        [cuentaId]
      );
      if (rows && rows.length > 0) lastSync = rows[0];
    } catch (e) {}

    res.json({
      success: true,
      status: 'online',
      cuenta: {
        id: req.user?.id,
        nombre: req.user?.nombre,
        email: req.user?.email
      },
      counts: {
        productos: total_productos,
        clientes: total_clientes,
        ventas: total_ventas
      },
      last_sync: lastSync,
      server_time: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
}
