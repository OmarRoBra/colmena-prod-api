import { Router } from 'express';
import * as trabajadoresController from './trabajadores.controller';
import * as trabajadoresDto from './trabajadores.dto';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

/**
 * @route   GET /api/v1/trabajadores
 * @desc    Get all trabajadores
 * @access  Private (admin, condoAdmin)
 */
router.get('/', authorize('admin', 'condoAdmin'), trabajadoresController.getAllTrabajadores);

/**
 * @route   GET /api/v1/trabajadores/:id
 * @desc    Get trabajador by ID
 * @access  Private (all authenticated users - filtered in controller)
 */
router.get('/:id', trabajadoresDto.getTrabajadorValidation, trabajadoresController.getTrabajadorById);

/**
 * @route   POST /api/v1/trabajadores
 * @desc    Create a new trabajador
 * @access  Private (admin, condoAdmin)
 */
router.post('/', authorize('admin', 'condoAdmin'), trabajadoresDto.createTrabajadorValidation, trabajadoresController.createTrabajador);

/**
 * @route   PUT /api/v1/trabajadores/:id
 * @desc    Update trabajador
 * @access  Private (admin, condoAdmin)
 */
router.put('/:id', authorize('admin', 'condoAdmin'), trabajadoresDto.updateTrabajadorValidation, trabajadoresController.updateTrabajador);

/**
 * @route   DELETE /api/v1/trabajadores/:id
 * @desc    Delete trabajador
 * @access  Private (admin)
 */
router.delete('/:id', authorize('admin'), trabajadoresDto.getTrabajadorValidation, trabajadoresController.deleteTrabajador);

export default router;
