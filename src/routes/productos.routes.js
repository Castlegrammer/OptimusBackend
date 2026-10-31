import { Router } from 'express';
import { getProductos, createProducto, updateProducto, deleteProducto } from '../controllers/productos.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { productoCreateSchema } from '../validators/entity.validator.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getProductos);
router.post('/', validate(productoCreateSchema), createProducto);
router.put('/:uuid', updateProducto);
router.delete('/:uuid', deleteProducto);

export default router;
