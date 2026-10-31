import { Router } from 'express';
import { getProveedores, createProveedor, updateProveedor, deleteProveedor } from '../controllers/proveedores.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { proveedorCreateSchema } from '../validators/entity.validator.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getProveedores);
router.post('/', validate(proveedorCreateSchema), createProveedor);
router.put('/:uuid', updateProveedor);
router.delete('/:uuid', deleteProveedor);

export default router;
