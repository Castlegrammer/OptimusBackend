import { z } from 'zod';

const numericField = (defaultValue = 0) =>
  z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return defaultValue;
    const num = Number(val);
    return isNaN(num) ? defaultValue : num;
  }, z.number());

export const productoCreateSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre del producto es requerido'),
  descripcion: z.string().optional().default(''),
  categoria: z.string().optional().default(''),
  categoria_uuid: z.string().nullable().optional(),
  proveedor: z.string().optional().default(''),
  proveedor_uuid: z.string().nullable().optional(),
  marca: z.string().optional().default(''),
  tamano: z.string().optional().default(''),
  color: z.string().optional().default(''),
  cantidad: numericField(0),
  costo: numericField(0),
  precio: numericField(0),
  unidad: z.string().optional().default('Unidad'),
  maximo: numericField(0),
  minimo: numericField(0),
  fecha_vencimiento: z.string().optional().default(''),
  foto: z.string().nullable().optional()
});

export const clienteCreateSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre del cliente es obligatorio'),
  responsable: z.string().optional().default(''),
  direccion: z.string().optional().default(''),
  telefono: z.string().optional().default(''),
  zona: z.string().optional().default('')
});

export const proveedorCreateSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre del proveedor es obligatorio'),
  responsable: z.string().optional().default(''),
  direccion: z.string().optional().default(''),
  telefono: z.string().optional().default(''),
  zona: z.string().optional().default('')
});

export const ventaItemSchema = z.object({
  producto_uuid: z.string().nullable().optional(),
  producto_id: z.any().optional(),
  id: z.any().optional(),
  uuid: z.string().nullable().optional(),
  producto: z.string().min(1, 'Nombre de producto requerido'),
  cantidad: numericField(1),
  precio: numericField(0),
  total: numericField(0)
}).passthrough();

export const ventaCreateSchema = z.object({
  cliente: z.string().optional().default(''),
  cliente_uuid: z.string().nullable().optional(),
  fecha: z.string().optional(),
  total: numericField(0),
  total_usd: numericField(0).optional(),
  total_bs: numericField(0).optional(),
  tasa_bcv: numericField(0).optional(),
  inicial: numericField(0),
  detalles: z.array(ventaItemSchema).min(1, 'La venta debe contener al menos un detalle')
}).passthrough();
