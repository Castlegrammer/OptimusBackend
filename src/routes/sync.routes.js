import { Router } from 'express';
import { pushSync, pullSync, getSyncStatus } from '../controllers/sync.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { pushSyncPayloadSchema, pullSyncQuerySchema } from '../validators/sync.validator.js';

const router = Router();

// Todas las rutas de sincronización requieren autenticación JWT
router.use(authenticateToken);

router.post('/push', validate(pushSyncPayloadSchema, 'body'), pushSync);
router.get('/pull', validate(pullSyncQuerySchema, 'query'), pullSync);
router.get('/status', getSyncStatus);

export default router;
