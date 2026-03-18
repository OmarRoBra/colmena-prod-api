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
router.use(authorize('admin', 'condoAdmin', 'superAdmin'));

router.post('/', createProveedorExternoValidation, createProveedorExterno);
router.get('/', listProveedoresExternosValidation, getProveedoresExternos);
router.get('/:id', getProveedorExternoValidation, getProveedorExternoById);
router.put('/:id', updateProveedorExternoValidation, updateProveedorExterno);
router.delete('/:id', getProveedorExternoValidation, deleteProveedorExterno);

export default router;
