import { Router } from 'express';
import * as reservacionesController from './reservaciones.controller';
import * as reservacionesDto from './reservaciones.dto';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/reservaciones
 * @desc    Get all reservaciones
 * @access  Private (admin, condoAdmin)
 */
router.get(
  '/',
  authorize('admin', 'condoAdmin'),
  reservacionesController.getAllReservaciones
);

/**
 * @route   GET /api/v1/reservaciones/condominio/:condominioId
 * @desc    Get reservaciones by condominium
 * @access  Private (authenticated users)
 */
router.get(
  '/condominio/:condominioId',
  reservacionesController.getByCondominio
);

/**
 * @route   GET /api/v1/reservaciones/:id
 * @desc    Get reservacion by ID
 * @access  Private (all authenticated users)
 */
router.get(
  '/:id',
  reservacionesDto.getReservacionValidation,
  reservacionesController.getReservacionById
);

/**
 * @route   POST /api/v1/reservaciones
 * @desc    Create a new reservacion
 * @access  Private (all authenticated users)
 */
router.post(
  '/',
  reservacionesDto.createReservacionValidation,
  reservacionesController.createReservacion
);

/**
 * @route   PUT /api/v1/reservaciones/:id
 * @desc    Update reservacion
 * @access  Private (admin, condoAdmin)
 */
router.put(
  '/:id',
  authorize('admin', 'condoAdmin'),
  reservacionesDto.updateReservacionValidation,
  reservacionesController.updateReservacion
);

/**
 * @route   PUT /api/v1/reservaciones/:id/aprobar
 * @desc    Approve reservacion
 * @access  Private (admin, condoAdmin)
 */
router.put(
  '/:id/aprobar',
  authorize('admin', 'condoAdmin'),
  reservacionesDto.aprobarReservacionValidation,
  reservacionesController.aprobarReservacion
);

/**
 * @route   PUT /api/v1/reservaciones/:id/rechazar
 * @desc    Reject reservacion
 * @access  Private (admin, condoAdmin)
 */
router.put(
  '/:id/rechazar',
  authorize('admin', 'condoAdmin'),
  reservacionesDto.rechazarReservacionValidation,
  reservacionesController.rechazarReservacion
);

/**
 * @route   DELETE /api/v1/reservaciones/:id
 * @desc    Delete reservacion
 * @access  Private (admin, condoAdmin)
 */
router.delete(
  '/:id',
  authorize('admin', 'condoAdmin'),
  reservacionesDto.getReservacionValidation,
  reservacionesController.deleteReservacion
);

export default router;
