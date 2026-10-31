import { Router } from 'express';
import { getClientes, createCliente, updateCliente, deleteCliente } from '../controllers/clientes.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { clienteCreateSchema } from '../validators/entity.validator.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getClientes);
router.post('/', validate(clienteCreateSchema), createCliente);
router.put('/:uuid', updateCliente);
router.delete('/:uuid', deleteCliente);

export default router;
