import { Router } from 'express';
import * as proveedoresController from './proveedores.controller';
import * as proveedoresDto from './proveedores.dto';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

/**
 * @route   GET /api/v1/proveedores
 * @desc    Get all proveedores
 * @access  Private (admin, condoAdmin)
 */
router.get('/', authorize('admin', 'condoAdmin'), proveedoresController.getAllProveedores);

/**
 * @route   GET /api/v1/proveedores/:id
 * @desc    Get proveedor by ID
 * @access  Private (all authenticated users)
 */
router.get('/:id', proveedoresDto.getProveedorValidation, proveedoresController.getProveedorById);

/**
 * @route   POST /api/v1/proveedores
 * @desc    Create a new proveedor
 * @access  Private (admin, condoAdmin)
 */
router.post('/', authorize('admin', 'condoAdmin'), proveedoresDto.createProveedorValidation, proveedoresController.createProveedor);

/**
 * @route   PUT /api/v1/proveedores/:id
 * @desc    Update proveedor
 * @access  Private (admin, condoAdmin)
 */
router.put('/:id', authorize('admin', 'condoAdmin'), proveedoresDto.updateProveedorValidation, proveedoresController.updateProveedor);

/**
 * @route   DELETE /api/v1/proveedores/:id
 * @desc    Delete proveedor
 * @access  Private (admin)
 */
router.delete('/:id', authorize('admin'), proveedoresDto.getProveedorValidation, proveedoresController.deleteProveedor);

export default router;
