import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { testDbConnection } from './config/db.js';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware.js';

import authRoutes from './routes/auth.routes.js';
import syncRoutes from './routes/sync.routes.js';
import productosRoutes from './routes/productos.routes.js';
import clientesRoutes from './routes/clientes.routes.js';
import ventasRoutes from './routes/ventas.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Seguridad y utilidades
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN === '*' ? '*' : process.env.CORS_ORIGIN?.split(','),
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health Check
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Optimus360 REST API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Rutas principales
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/sync', syncRoutes);
app.use('/api/v1/productos', productosRoutes);
app.use('/api/v1/clientes', clientesRoutes);
app.use('/api/v1/ventas', ventasRoutes);

// Manejadores de error
app.use(notFoundHandler);
app.use(errorHandler);

// Inicio del servidor
app.listen(PORT, async () => {
  console.log(`🚀 Optimus360 API escuchando en el puerto ${PORT}`);
  console.log(`📡 URL Base: http://localhost:${PORT}/api/v1`);
  console.log(`🩺 Health check: http://localhost:${PORT}/api/v1/health`);
  await testDbConnection();
});

export default app;
