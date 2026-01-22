import { Router } from 'express';
import * as unidadesController from './unidades.controller';
import * as unidadesDto from './unidades.dto';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { cache, invalidateCache, CacheTTL } from '../../middlewares/cache.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/unidades
 * @desc    Get all unidades
 * @access  Private (admin, condoAdmin)
 */
router.get(
  '/',
  authorize('admin', 'condoAdmin'),
  cache({ ttl: CacheTTL.MEDIUM }),
  unidadesController.getAllUnidades
);

/**
 * @route   GET /api/v1/unidades/condominio/:condominioId
 * @desc    Get unidades by condominio ID
 * @access  Private (admin, condoAdmin)
 */
router.get(
  '/condominio/:condominioId',
  authorize('admin', 'condoAdmin'),
  unidadesDto.getUnidadesByCondominioValidation,
  cache({ ttl: CacheTTL.MEDIUM }),
  unidadesController.getUnidadesByCondominio
);

/**
 * @route   GET /api/v1/unidades/:id
 * @desc    Get unidad by ID
 * @access  Private (admin, condoAdmin, owner, tenant)
 */
router.get(
  '/:id',
  authorize('admin', 'condoAdmin', 'owner', 'tenant'),
  unidadesDto.getUnidadValidation,
  cache({ ttl: CacheTTL.MEDIUM }),
  unidadesController.getUnidadById
);

/**
 * @route   POST /api/v1/unidades
 * @desc    Create a new unidad
 * @access  Private (admin, condoAdmin)
 */
router.post(
  '/',
  authorize('admin', 'condoAdmin'),
  unidadesDto.createUnidadValidation,
  invalidateCache(['*unidades*', '*condominios*']),
  unidadesController.createUnidad
);

/**
 * @route   PUT /api/v1/unidades/:id
 * @desc    Update unidad
 * @access  Private (admin, condoAdmin)
 */
router.put(
  '/:id',
  authorize('admin', 'condoAdmin'),
  unidadesDto.updateUnidadValidation,
  invalidateCache(['*unidades*', '*condominios*']),
  unidadesController.updateUnidad
);

/**
 * @route   DELETE /api/v1/unidades/:id
 * @desc    Delete unidad (soft delete)
 * @access  Private (admin)
 */
router.delete(
  '/:id',
  authorize('admin'),
  unidadesDto.getUnidadValidation,
  invalidateCache(['*unidades*', '*condominios*']),
  unidadesController.deleteUnidad
);

export default router;
