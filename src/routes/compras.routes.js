import { Router } from 'express';
import { getCompras, createCompra, deleteCompra } from '../controllers/compras.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getCompras);
router.post('/', createCompra);
router.delete('/:uuid', deleteCompra);

export default router;
