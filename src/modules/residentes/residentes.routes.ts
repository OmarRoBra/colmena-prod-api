import { Router } from 'express';
import * as residentesController from './residentes.controller';
import * as residentesDto from './residentes.dto';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/residentes
 * @desc    Get all residents
 * @access  Private (admin, condoAdmin)
 */
router.get(
  '/',
  authorize('admin', 'condoAdmin'),
  residentesController.getAllResidents
);

/**
 * @route   GET /api/v1/residentes/unidad/:unidadId
 * @desc    Get residents by unit ID
 * @access  Private (admin, condoAdmin, owner, tenant)
 */
router.get(
  '/unidad/:unidadId',
  authorize('admin', 'condoAdmin', 'owner', 'tenant'),
  residentesDto.getResidentsByUnitValidation,
  residentesController.getResidentsByUnit
);

/**
 * @route   GET /api/v1/residentes/:id
 * @desc    Get resident by ID
 * @access  Private (admin, condoAdmin, owner, tenant)
 */
router.get(
  '/:id',
  authorize('admin', 'condoAdmin', 'owner', 'tenant'),
  residentesDto.getResidentValidation,
  residentesController.getResidentById
);

/**
 * @route   POST /api/v1/residentes
 * @desc    Create a new resident
 * @access  Private (admin, condoAdmin)
 */
router.post(
  '/',
  authorize('admin', 'condoAdmin'),
  residentesDto.createResidentValidation,
  residentesController.createResident
);

/**
 * @route   PUT /api/v1/residentes/:id
 * @desc    Update resident
 * @access  Private (admin, condoAdmin)
 */
router.put(
  '/:id',
  authorize('admin', 'condoAdmin'),
  residentesDto.updateResidentValidation,
  residentesController.updateResident
);

/**
 * @route   DELETE /api/v1/residentes/:id
 * @desc    Delete resident
 * @access  Private (admin)
 */
router.delete(
  '/:id',
  authorize('admin'),
  residentesDto.getResidentValidation,
  residentesController.deleteResident
);

export default router;
