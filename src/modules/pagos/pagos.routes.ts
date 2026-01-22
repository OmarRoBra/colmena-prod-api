import { Router } from 'express';
import * as pagosController from './pagos.controller';
import * as pagosDto from './pagos.dto';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/pagos
 * @desc    Get all pagos
 * @access  Private (admin, condoAdmin)
 */
router.get(
  '/',
  authorize('admin', 'condoAdmin'),
  pagosController.getAllPagos
);

/**
 * @route   GET /api/v1/pagos/unidad/:unidadId
 * @desc    Get pagos by unidad ID
 * @access  Private (admin, condoAdmin, owner, tenant)
 */
router.get(
  '/unidad/:unidadId',
  authorize('admin', 'condoAdmin', 'owner', 'tenant'),
  pagosDto.getPagosByUnidadValidation,
  pagosController.getPagosByUnidad
);

/**
 * @route   GET /api/v1/pagos/:id
 * @desc    Get pago by ID
 * @access  Private (admin, condoAdmin, owner, tenant)
 */
router.get(
  '/:id',
  authorize('admin', 'condoAdmin', 'owner', 'tenant'),
  pagosDto.getPagoValidation,
  pagosController.getPagoById
);

/**
 * @route   POST /api/v1/pagos
 * @desc    Create a new pago
 * @access  Private (all authenticated users)
 */
router.post(
  '/',
  pagosDto.createPagoValidation,
  pagosController.createPago
);

/**
 * @route   PUT /api/v1/pagos/:id
 * @desc    Update pago
 * @access  Private (admin, condoAdmin)
 */
router.put(
  '/:id',
  authorize('admin', 'condoAdmin'),
  pagosDto.updatePagoValidation,
  pagosController.updatePago
);

/**
 * @route   DELETE /api/v1/pagos/:id
 * @desc    Delete pago
 * @access  Private (admin)
 */
router.delete(
  '/:id',
  authorize('admin'),
  pagosDto.getPagoValidation,
  pagosController.deletePago
);

export default router;
