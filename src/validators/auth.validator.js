import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('El correo electrónico no tiene un formato válido'),
  password: z.string().min(4, 'La contraseña debe tener al menos 4 caracteres')
});

export const registerSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().trim().email('El correo electrónico no tiene un formato válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres para mayor seguridad'),
  moneda: z.string().trim().max(10).default('USD').optional(),
  tipo: z.string().trim().max(50).default('Administrador').optional()
});
