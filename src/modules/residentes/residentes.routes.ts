import { Router } from 'express';
import * as residentesController from './residentes.controller';
import * as residentesDto from './residentes.dto';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { cache, invalidateCache, CacheTTL } from '../../middlewares/cache.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/residentes/me
 * @desc    Get current user's resident profile
 * @access  Private (resident)
 */
router.get(
  '/me',
  authorize('resident', 'admin', 'condoAdmin'),
  cache({ ttl: CacheTTL.SHORT }),
  residentesController.getMyResidente
);

/**
 * @route   GET /api/v1/residentes
 * @desc    Get all residents
 * @access  Private (admin, condoAdmin)
 */
router.get(
  '/',
  authorize('admin', 'condoAdmin'),
  cache({ ttl: CacheTTL.SHORT }),
  residentesController.getAllResidents
);

/**
 * @route   GET /api/v1/residentes/condominio/:condominioId
 * @desc    Get residents by condominium ID
 * @access  Private (admin, condoAdmin)
 */
router.get(
  '/condominio/:condominioId',
  authorize('admin', 'condoAdmin'),
  cache({ ttl: CacheTTL.SHORT }),
  residentesController.getResidentsByCondominio
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
  cache({ ttl: CacheTTL.SHORT }),
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
  cache({ ttl: CacheTTL.SHORT }),
  residentesController.getResidentById
);

router.get(
  '/:id/checklist',
  authorize('admin', 'condoAdmin'),
  residentesDto.getResidentChecklistValidation,
  cache({ ttl: CacheTTL.SHORT }),
  residentesController.getResidentChecklist
);

router.post(
  '/:id/cleanup-access',
  authorize('admin', 'condoAdmin'),
  residentesDto.cleanupResidentAccessValidation,
  invalidateCache(['*residentes*', '*visitas*', '*familiares*', '*notificaciones*', '*unidades*']),
  residentesController.cleanupResidentAccess
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
  invalidateCache(['*residentes*', '*unidades*', '*notificaciones*']),
  residentesController.createResident
);

/**
 * @route   PUT /api/v1/residentes/:id
 * @desc    Update resident
 * @access  Private (admin, condoAdmin, resident — own profile only)
 */
router.put(
  '/:id',
  authorize('admin', 'condoAdmin', 'resident'),
  residentesDto.updateResidentValidation,
  invalidateCache(['*residentes*', '*unidades*', '*visitas*', '*familiares*', '*notificaciones*']),
  residentesController.updateResident
);

router.put(
  '/checklists/:checklistId',
  authorize('admin', 'condoAdmin'),
  residentesDto.updateChecklistItemValidation,
  invalidateCache(['*residentes*']),
  residentesController.updateChecklistItem
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
  invalidateCache(['*residentes*', '*unidades*', '*visitas*', '*familiares*', '*notificaciones*']),
  residentesController.deleteResident
);

export default router;
