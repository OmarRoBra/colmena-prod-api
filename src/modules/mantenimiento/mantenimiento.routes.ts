import { Router } from 'express';
import * as mantenimientoController from './mantenimiento.controller';
import * as mantenimientoDto from './mantenimiento.dto';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

/**
 * @route   GET /api/v1/mantenimiento
 * @desc    Get all mantenimiento requests
 * @access  Private (admin, condoAdmin)
 */
router.get('/', authorize('admin', 'condoAdmin'), mantenimientoController.getAllMantenimiento);

/**
 * @route   GET /api/v1/mantenimiento/:id
 * @desc    Get mantenimiento by ID
 * @access  Private (all authenticated users - filtered in controller)
 */
router.get('/:id', mantenimientoDto.getMantenimientoValidation, mantenimientoController.getMantenimientoById);

/**
 * @route   POST /api/v1/mantenimiento
 * @desc    Create a new mantenimiento request
 * @access  Private (all authenticated users - filtered in controller)
 */
router.post('/', mantenimientoDto.createMantenimientoValidation, mantenimientoController.createMantenimiento);

/**
 * @route   PUT /api/v1/mantenimiento/:id
 * @desc    Update mantenimiento
 * @access  Private (admin, condoAdmin, worker, serviceProvider)
 */
router.put('/:id', authorize('admin', 'condoAdmin', 'worker', 'serviceProvider'), mantenimientoDto.updateMantenimientoValidation, mantenimientoController.updateMantenimiento);

/**
 * @route   DELETE /api/v1/mantenimiento/:id
 * @desc    Delete mantenimiento
 * @access  Private (admin)
 */
router.delete('/:id', authorize('admin'), mantenimientoDto.getMantenimientoValidation, mantenimientoController.deleteMantenimiento);

export default router;
