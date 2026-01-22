import { Router } from 'express';
import * as condominiosController from './condominios.controller';
import * as condominiosDto from './condominios.dto';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { cache, invalidateCache, CacheTTL } from '../../middlewares/cache.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/condominios
 * @desc    Get all condominios
 * @access  Private (admin, condoAdmin)
 */
router.get(
  '/',
  authorize('admin', 'condoAdmin'),
  cache({ ttl: CacheTTL.LONG }),
  condominiosController.getAllCondominios
);

/**
 * @route   GET /api/v1/condominios/gerente/:gerenteId
 * @desc    Get all condominios managed by a specific gerente
 * @access  Private (admin, condoAdmin)
 */
router.get(
  '/gerente/:gerenteId',
  authorize('admin', 'condoAdmin'),
  condominiosDto.getCondominiosByGerenteValidation,
  cache({ ttl: CacheTTL.LONG }),
  condominiosController.getCondominiosByGerente
);

/**
 * @route   GET /api/v1/condominios/:id
 * @desc    Get condominio by ID
 * @access  Private (admin, condoAdmin)
 */
router.get(
  '/:id',
  authorize('admin', 'condoAdmin'),
  condominiosDto.getCondominioValidation,
  cache({ ttl: CacheTTL.LONG }),
  condominiosController.getCondominioById
);

/**
 * @route   POST /api/v1/condominios
 * @desc    Create a new condominio
 * @access  Private (admin)
 */
router.post(
  '/',
  authorize('admin'),
  condominiosDto.createCondominioValidation,
  invalidateCache(['*condominios*']),
  condominiosController.createCondominio
);

/**
 * @route   PUT /api/v1/condominios/:id
 * @desc    Update condominio
 * @access  Private (admin, condoAdmin)
 */
router.put(
  '/:id',
  authorize('admin', 'condoAdmin'),
  condominiosDto.updateCondominioValidation,
  invalidateCache(['*condominios*']),
  condominiosController.updateCondominio
);

/**
 * @route   DELETE /api/v1/condominios/:id
 * @desc    Delete condominio (soft delete)
 * @access  Private (admin)
 */
router.delete(
  '/:id',
  authorize('admin'),
  condominiosDto.getCondominioValidation,
  invalidateCache(['*condominios*']),
  condominiosController.deleteCondominio
);

export default router;
