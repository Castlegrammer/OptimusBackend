import { z } from 'zod';

// Helper para aceptar números tanto en string como en formato numérico nativo
const numericField = (defaultValue = 0) =>
  z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return defaultValue;
    const num = Number(val);
    return isNaN(num) ? defaultValue : num;
  }, z.number());

const booleanFlag = (defaultValue = 0) =>
  z.preprocess((val) => {
    if (val === undefined || val === null) return defaultValue;
    if (typeof val === 'string') {
      const v = val.trim().toUpperCase();
      if (v === 'SI' || v === '1' || v === 'TRUE') return 1;
      return 0;
    }
    return val ? 1 : 0;
  }, z.number().int());

// 1. Categoría
export const syncCategoriaSchema = z.object({
  uuid: z.string().min(1, 'El UUID de la categoría es requerido'),
  nombre: z.string().trim().min(1, 'El nombre de la categoría es requerido'),
  eliminado: booleanFlag(0).optional(),
  updated_at: z.string().optional()
});

// 2. Cliente
export const syncClienteSchema = z.object({
  uuid: z.string().min(1, 'El UUID del cliente es requerido'),
  nombre: z.string().trim().min(1, 'El nombre del cliente es requerido'),
  responsable: z.string().trim().default('').optional(),
  direccion: z.string().trim().default('').optional(),
  telefono: z.string().trim().default('').optional(),
  zona: z.string().trim().default('').optional(),
  fecha_creacion: z.string().default('').optional(),
  eliminado: booleanFlag(0).optional(),
  updated_at: z.string().optional()
});

// 3. Proveedor
export const syncProveedorSchema = z.object({
  uuid: z.string().min(1, 'El UUID del proveedor es requerido'),
  nombre: z.string().trim().min(1, 'El nombre del proveedor es requerido'),
  responsable: z.string().trim().default('').optional(),
  direccion: z.string().trim().default('').optional(),
  telefono: z.string().trim().default('').optional(),
  zona: z.string().trim().default('').optional(),
  fecha_creacion: z.string().default('').optional(),
  eliminado: booleanFlag(0).optional(),
  updated_at: z.string().optional()
});

// 4. Producto
export const syncProductoSchema = z.object({
  uuid: z.string().min(1, 'El UUID del producto es requerido'),
  nombre: z.string().trim().min(1, 'El nombre del producto es requerido'),
  descripcion: z.string().default('').optional(),
  categoria: z.string().default('').optional(),
  categoria_uuid: z.string().nullable().optional(),
  proveedor: z.string().default('').optional(),
  proveedor_uuid: z.string().nullable().optional(),
  marca: z.string().default('').optional(),
  tamano: z.string().default('').optional(),
  color: z.string().default('').optional(),
  cantidad: numericField(0).optional(),
  costo: numericField(0).optional(),
  precio: numericField(0).optional(),
  unidad: z.string().default('Unidad').optional(),
  maximo: numericField(0).optional(),
  minimo: numericField(0).optional(),
  fecha_vencimiento: z.string().default('').optional(),
  foto: z.string().nullable().optional(),
  eliminado: booleanFlag(0).optional(),
  updated_at: z.string().optional()
});

// 5. Venta
export const syncVentaSchema = z.object({
  uuid: z.string().min(1, 'El UUID de la venta es requerido'),
  cliente: z.string().default('').optional(),
  cliente_uuid: z.string().nullable().optional(),
  fecha: z.string().default(''),
  total: numericField(0),
  inicial: numericField(0).optional(),
  eliminado: booleanFlag(0).optional(),
  updated_at: z.string().optional()
});

// 6. Venta Detalle
export const syncVentaDetalleSchema = z.object({
  uuid: z.string().min(1, 'El UUID del detalle es requerido'),
  venta_uuid: z.string().min(1, 'El UUID de la venta asociada es requerido'),
  producto_uuid: z.string().nullable().optional(),
  producto: z.string().min(1, 'El nombre del producto es requerido'),
  cantidad: numericField(1),
  precio: numericField(0),
  total: numericField(0),
  fecha: z.string().default('').optional(),
  eliminado: booleanFlag(0).optional(),
  updated_at: z.string().optional()
});

// 7. Compra
export const syncCompraSchema = z.object({
  uuid: z.string().min(1, 'El UUID de la compra es requerido'),
  proveedor: z.string().default('').optional(),
  proveedor_uuid: z.string().nullable().optional(),
  fecha: z.string().default(''),
  total: numericField(0),
  inicial: numericField(0).optional(),
  eliminado: booleanFlag(0).optional(),
  updated_at: z.string().optional()
});

// 8. Compra Detalle
export const syncCompraDetalleSchema = z.object({
  uuid: z.string().min(1, 'El UUID del detalle de compra es requerido'),
  compra_uuid: z.string().min(1, 'El UUID de la compra asociada es requerido'),
  producto_uuid: z.string().nullable().optional(),
  producto: z.string().min(1, 'El nombre del producto es requerido'),
  cantidad: numericField(1),
  precio: numericField(0),
  total: numericField(0),
  fecha: z.string().default('').optional(),
  eliminado: booleanFlag(0).optional(),
  updated_at: z.string().optional()
});

// 9. Abonos Clientes
export const syncAbonoClienteSchema = z.object({
  uuid: z.string().min(1, 'El UUID del abono es requerido'),
  cliente: z.string().default('').optional(),
  cliente_uuid: z.string().nullable().optional(),
  fecha: z.string().default(''),
  monto: numericField(0),
  eliminado: booleanFlag(0).optional(),
  updated_at: z.string().optional()
});

// 10. Pagos Proveedores
export const syncPagoProveedorSchema = z.object({
  uuid: z.string().min(1, 'El UUID del pago es requerido'),
  proveedor: z.string().default('').optional(),
  proveedor_uuid: z.string().nullable().optional(),
  fecha: z.string().default(''),
  monto: numericField(0),
  eliminado: booleanFlag(0).optional(),
  updated_at: z.string().optional()
});

// Payload completo de Push Sync
export const pushSyncPayloadSchema = z.object({
  dispositivo_id: z.string().default('android-app').optional(),
  categorias: z.array(syncCategoriaSchema).default([]),
  clientes: z.array(syncClienteSchema).default([]),
  proveedores: z.array(syncProveedorSchema).default([]),
  productos: z.array(syncProductoSchema).default([]),
  ventas: z.array(syncVentaSchema).default([]),
  venta_detalles: z.array(syncVentaDetalleSchema).default([]),
  compras: z.array(syncCompraSchema).default([]),
  compra_detalles: z.array(syncCompraDetalleSchema).default([]),
  abonos_clientes: z.array(syncAbonoClienteSchema).default([]),
  pagos_proveedores: z.array(syncPagoProveedorSchema).default([])
});

// Query params de Pull Sync
export const pullSyncQuerySchema = z.object({
  since: z.string().default('1970-01-01T00:00:00.000Z').optional()
});
