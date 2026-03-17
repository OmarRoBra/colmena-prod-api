import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import {
  createProveedorExterno,
  getProveedoresExternos,
  getProveedorExternoById,
  updateProveedorExterno,
  deleteProveedorExterno,
} from './proveedores-externos.controller';
import {
  createProveedorExternoValidation,
  updateProveedorExternoValidation,
  getProveedorExternoValidation,
  listProveedoresExternosValidation,
} from './proveedores-externos.dto';

const router = Router();
router.use(authenticate);

router.post('/', authorize('condoAdmin', 'superAdmin'), createProveedorExternoValidation, createProveedorExterno);
router.get('/', listProveedoresExternosValidation, getProveedoresExternos);
router.get('/:id', getProveedorExternoValidation, getProveedorExternoById);
router.put('/:id', authorize('condoAdmin', 'superAdmin'), updateProveedorExternoValidation, updateProveedorExterno);
router.delete('/:id', authorize('condoAdmin', 'superAdmin'), getProveedorExternoValidation, deleteProveedorExterno);

export default router;
