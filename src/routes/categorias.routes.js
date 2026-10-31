import { Router } from 'express';
import { getCategorias, createCategoria, deleteCategoria } from '../controllers/categorias.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(authenticateToken);

router.get('/', getCategorias);
router.post('/', createCategoria);
router.delete('/:uuid', deleteCategoria);

export default router;
