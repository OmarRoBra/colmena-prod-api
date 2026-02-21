import { Router } from 'express';
import * as areasComunesController from './areas-comunes.controller';
import * as areasComunesDto from './areas-comunes.dto';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/areas-comunes/condominio/:condominioId
 * @desc    Get all areas comunes for a condominium
 * @access  Private (authenticated users)
 */
router.get(
  '/condominio/:condominioId',
  areasComunesController.getAreasByCondominio
);

/**
 * @route   GET /api/v1/areas-comunes/:id
 * @desc    Get area comun by ID
 * @access  Private (authenticated users)
 */
router.get(
  '/:id',
  areasComunesDto.getAreaComunValidation,
  areasComunesController.getAreaById
);

/**
 * @route   POST /api/v1/areas-comunes
 * @desc    Create a new area comun
 * @access  Private (admin, condoAdmin)
 */
router.post(
  '/',
  authorize('admin', 'condoAdmin'),
  areasComunesDto.createAreaComunValidation,
  areasComunesController.createArea
);

/**
 * @route   PUT /api/v1/areas-comunes/:id
 * @desc    Update area comun
 * @access  Private (admin, condoAdmin)
 */
router.put(
  '/:id',
  authorize('admin', 'condoAdmin'),
  areasComunesDto.updateAreaComunValidation,
  areasComunesController.updateArea
);

/**
 * @route   DELETE /api/v1/areas-comunes/:id
 * @desc    Delete area comun
 * @access  Private (admin)
 */
router.delete(
  '/:id',
  authorize('admin'),
  areasComunesDto.getAreaComunValidation,
  areasComunesController.deleteArea
);

export default router;
