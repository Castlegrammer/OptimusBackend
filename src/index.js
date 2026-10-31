import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { pool, testDbConnection, initDatabaseTables } from './config/db.js';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware.js';

import authRoutes from './routes/auth.routes.js';
import syncRoutes from './routes/sync.routes.js';
import productosRoutes from './routes/productos.routes.js';
import clientesRoutes from './routes/clientes.routes.js';
import proveedoresRoutes from './routes/proveedores.routes.js';
import ventasRoutes from './routes/ventas.routes.js';
import categoriasRoutes from './routes/categorias.routes.js';

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

// Ruta de bienvenida en la raíz
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 Optimus360 API REST está activa y en línea',
    version: '1.0.0',
    documentation: '/api/v1/health',
    endpoints: {
      health: '/api/v1/health',
      auth: '/api/v1/auth/login',
      sync_push: '/api/v1/sync/push',
      sync_pull: '/api/v1/sync/pull',
      sync_status: '/api/v1/sync/status',
      productos: '/api/v1/productos',
      clientes: '/api/v1/clientes',
      ventas: '/api/v1/ventas'
    }
  });
});

// Health Check
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Optimus360 REST API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Diagnóstico de base de datos MySQL en vivo
app.get('/api/v1/health/db', async (req, res) => {
  try {
    const [tables] = await pool.query('SHOW TABLES');
    const tableList = tables.map(t => Object.values(t)[0]);
    
    let userCount = 0;
    try {
      const [c] = await pool.query('SELECT COUNT(*) as count FROM `Cuenta`');
      userCount = c[0].count;
    } catch (e1) {}

    res.json({
      success: true,
      database: process.env.DB_NAME || 'optimus_db',
      connected: true,
      tables: tableList,
      user_count: userCount,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Inicialización forzada de tablas desde endpoint
app.post('/api/v1/health/setup-db', async (req, res) => {
  try {
    const reports = await initDatabaseTables();
    const [tables] = await pool.query('SHOW TABLES');
    res.json({
      success: true,
      message: 'Tablas creadas y migradas exitosamente',
      reports,
      tables: tables.map(t => Object.values(t)[0])
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Rutas principales
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/sync', syncRoutes);
app.use('/api/v1/productos', productosRoutes);
app.use('/api/v1/clientes', clientesRoutes);
app.use('/api/v1/proveedores', proveedoresRoutes);
app.use('/api/v1/ventas', ventasRoutes);
app.use('/api/v1/categorias', categoriasRoutes);

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
