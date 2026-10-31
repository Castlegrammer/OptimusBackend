import { Router } from 'express';
import { getVentas, getVentaById, createVenta } from '../controllers/ventas.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { ventaCreateSchema } from '../validators/entity.validator.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getVentas);
router.get('/:uuid', getVentaById);
router.post('/', validate(ventaCreateSchema), createVenta);

export default router;
